import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import { fetchAllActive } from "./properties";
import { parseNaturalQuery } from "@/lib/atconiz/nl-search";
import { rankProperties } from "@/lib/atconiz/ranking";
import { valueProperty } from "@/lib/atconiz/valuation";
import { calculateEmi, rentalYield, affordability } from "@/lib/atconiz/finance";
import { track } from "@/lib/server/notify";

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_inventory",
      description: "Search the Atconiz catalog with structured filters. Never invent properties.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string" },
          city: { type: "string" },
          type: { type: "string" },
          listingType: { type: "string", enum: ["SALE", "RENT"] },
          minBeds: { type: "number" },
          maxPrice: { type: "number" },
          amenity: { type: "string" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_property",
      description: "Fetch one catalog property by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "value_property",
      description: "Run the Atconiz comparable valuation engine for a property id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_calculator",
      description: "Run EMI, yield, or affordability calculators.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["emi", "yield", "affordability"] },
          principal: { type: "number" },
          annualRatePct: { type: "number" },
          tenureYears: { type: "number" },
          price: { type: "number" },
          monthlyRent: { type: "number" },
          monthlyIncome: { type: "number" },
          downPayment: { type: "number" },
        },
        required: ["kind"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "market_snapshot",
      description: "City-level catalog stats from current inventory only.",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
      },
    },
  },
];

function compactProperty(p: {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  listingType: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  amenities: string[];
  provenance: string;
}) {
  return {
    id: p.id,
    title: p.title,
    city: p.city,
    country: p.country,
    type: p.propertyType,
    listingType: p.listingType,
    price: p.price,
    currency: p.currency,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    areaSqft: p.areaSqft,
    amenities: p.amenities.slice(0, 8),
    provenance: p.provenance,
  };
}

async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const all = await fetchAllActive();
  if (name === "search_inventory") {
    const parsed = parseNaturalQuery(String(args.q ?? ""));
    const q = {
      ...parsed,
      city: (args.city as string) || parsed.city,
      type: (args.type as string) || parsed.type,
      listingType: (args.listingType as "SALE" | "RENT") || parsed.listingType,
      minBeds: (args.minBeds as number) || parsed.minBeds,
      maxPrice: (args.maxPrice as number) || parsed.maxPrice,
      amenity: (args.amenity as string) || parsed.amenity,
    };
    const ranked = rankProperties(all, q).slice(0, 6);
    return { count: ranked.length, results: ranked.map(compactProperty) };
  }
  if (name === "get_property") {
    const p = all.find((x) => x.id === args.id);
    return p ? compactProperty(p) : { error: "not_found" };
  }
  if (name === "value_property") {
    const p = all.find((x) => x.id === args.id);
    if (!p) return { error: "not_found" };
    return valueProperty(p, all);
  }
  if (name === "run_calculator") {
    const kind = String(args.kind);
    if (kind === "emi") {
      return calculateEmi({
        principal: Number(args.principal ?? 0),
        annualRatePct: Number(args.annualRatePct ?? 6.5),
        tenureYears: Number(args.tenureYears ?? 20),
      });
    }
    if (kind === "yield") {
      return rentalYield({
        price: Number(args.price ?? 0),
        monthlyRent: Number(args.monthlyRent ?? 0),
      });
    }
    if (kind === "affordability") {
      return affordability({
        monthlyIncome: Number(args.monthlyIncome ?? 0),
        monthlyDebts: 0,
        downPayment: Number(args.downPayment ?? 0),
        annualRatePct: Number(args.annualRatePct ?? 6.5),
        tenureYears: Number(args.tenureYears ?? 25),
      });
    }
    return { error: "unknown_calculator" };
  }
  if (name === "market_snapshot") {
    const city = args.city ? String(args.city).toLowerCase() : null;
    const set = city ? all.filter((p) => p.city.toLowerCase() === city) : all;
    const sales = set.filter((p) => p.listingType === "SALE");
    const avg =
      sales.length === 0 ? 0 : sales.reduce((s, p) => s + p.price, 0) / sales.length;
    return {
      city: args.city ?? "all",
      listings: set.length,
      saleListings: sales.length,
      averageSalePriceNative: Math.round(avg),
      types: [...new Set(set.map((p) => p.propertyType))],
      note: "Computed from Atconiz reference catalog only — not a live index.",
    };
  }
  return { error: "unknown_tool" };
}

type ChatMessage = { role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string; name?: string };

async function complete(messages: ChatMessage[], withTools: boolean) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false as const, error: "AI is not available in this environment" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.4,
      max_tokens: 900,
      messages,
      ...(withTools ? { tools: TOOLS, tool_choice: "auto" } : {}),
    }),
  });
  if (!res.ok) {
    return { ok: false as const, error: `xAI API error ${res.status}` };
  }
  const body = (await res.json()) as {
    choices: { message: ChatMessage }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    ok: true as const,
    message: body.choices[0]?.message,
    usage: body.usage,
  };
}

export const aiChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      message: z.string().min(1).max(2000),
      conversationId: z.string().optional(),
      propertyId: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const used = await sql<{ c: number }>`
      select count(*)::int as c from ai_usage
      where user_id = ${context.userId} and created_at > now() - interval '1 day'
    `;
    if ((used[0]?.c ?? 0) >= 40) {
      return { ok: false as const, error: "Daily AI allowance reached. Try again tomorrow." };
    }

    let conversationId = data.conversationId;
    if (conversationId) {
      const own = await sql<{ id: string }>`
        select id from ai_conversations where id = ${conversationId} and user_id = ${context.userId} limit 1
      `;
      if (!own[0]) conversationId = undefined;
    }
    if (!conversationId) {
      conversationId = nid("convo");
      await sql`
        insert into ai_conversations (id, user_id, title)
        values (${conversationId}, ${context.userId}, ${data.message.slice(0, 72)})
      `;
    }

    const history = await sql<{ role: string; content: string }>`
      select role, content from ai_messages
      where conversation_id = ${conversationId}
      order by created_at asc
      limit 16
    `;

    const all = await fetchAllActive();
    const focus = data.propertyId ? all.find((p) => p.id === data.propertyId) : null;

    const system = [
      "You are Atconiz Intelligence, a private real-estate research copilot.",
      "Only discuss properties that exist in tool results or the provided catalog context.",
      "Never invent listings, prices, schools, commute times, or legal facts.",
      "If inventory is empty for a query, say so and suggest relaxing filters.",
      "Catalog records marked SEED_DEVELOPMENT or REFERENCE are demonstration inventory — label them as reference catalog, never as verified live market listings.",
      "Valuation numbers must come from the value_property tool. Label them as model estimates with confidence.",
      "You cannot book viewings or send email yourself — you may draft what the user should confirm in the app.",
      "Be concise, editorial, and precise. No emoji.",
      focus
        ? `Focused property: ${JSON.stringify(compactProperty(focus))}`
        : `Catalog size: ${all.length} active reference listings.`,
    ].join("\n");

    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    await sql`
      insert into ai_messages (id, conversation_id, role, content)
      values (${nid("msg")}, ${conversationId}, ${"user"}, ${data.message})
    `;

    let result = await complete(messages, true);
    if (!result.ok) return { ok: false as const, error: result.error, conversationId };

    const toolCalls = (result.message?.tool_calls ?? []) as Array<{
      id: string;
      function: { name: string; arguments: string };
    }>;

    if (toolCalls.length) {
      messages.push(result.message as ChatMessage);
      for (const call of toolCalls.slice(0, 4)) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        const out = await runTool(call.function.name, args);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(out).slice(0, 8000),
        });
      }
      result = await complete(messages, false);
      if (!result.ok) return { ok: false as const, error: result.error, conversationId };
    }

    const text = result.message?.content ?? "I could not complete that request.";
    await sql`
      insert into ai_messages (id, conversation_id, role, content, metadata)
      values (${nid("msg")}, ${conversationId}, ${"assistant"}, ${text}, ${JSON.stringify({ model: "grok-4.5" })}::jsonb)
    `;
    await sql`
      insert into ai_usage (id, user_id, model, tokens_in, tokens_out)
      values (${nid("use")}, ${context.userId}, ${"grok-4.5"}, ${result.usage?.prompt_tokens ?? 0}, ${result.usage?.completion_tokens ?? 0})
    `;
    await sql`update ai_conversations set updated_at = now() where id = ${conversationId} and user_id = ${context.userId}`;
    await track({ userId: context.userId, name: "ai_chat", payload: { conversationId } });

    return { ok: true as const, text, conversationId };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{ id: string; title: string | null; updated_at: string }>`
      select id, title, updated_at from ai_conversations
      where user_id = ${context.userId}
      order by updated_at desc
      limit 20
    `;
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const own = await sql<{ id: string }>`
      select id from ai_conversations where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    if (!own[0]) return { messages: [] as { role: string; content: string }[] };
    const messages = await sql<{ role: string; content: string }>`
      select role, content from ai_messages where conversation_id = ${data.id} order by created_at asc
    `;
    return { messages };
  });
