import Groq from "groq-sdk";
import { groqTaskSchema, type GroqTaskOutput } from "@/lib/schemas";
import {
  PLANE_TASK_SYSTEM_PROMPT,
  PLANE_TASK_USER_PROMPT,
} from "@/lib/groq/prompts";

const STRUCTURED_OUTPUT_MODELS = new Set([
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-safeguard-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
]);

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const MAX_COMPLETION_TOKENS = 16_384;

const JSON_SHAPE_PROMPT = `Return JSON with this exact shape:
{
  "tasks": [
    {
      "name": "string",
      "description_html": "string (full detailed HTML)",
      "priority": "urgent|high|medium|low|none",
      "suggested_assignee_name": "optional string",
      "suggested_module_name": "optional string",
      "module_ids": ["optional uuid strings"],
      "follow_up_comment_html": "optional string"
    }
  ]
}`;

function buildGroqJsonSchema() {
  const schema = groqTaskSchema.toJSONSchema() as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

function parseGroqContent(content: string): GroqTaskOutput {
  const parsed = groqTaskSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error(`Invalid Groq response: ${parsed.error.message}`);
  }
  return parsed.data;
}

function supportsJsonSchema(model: string) {
  return STRUCTURED_OUTPUT_MODELS.has(model) || model.includes("gpt-oss");
}

async function requestJsonSchema(
  groq: Groq,
  model: string,
  rawInput: string,
): Promise<GroqTaskOutput> {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: PLANE_TASK_SYSTEM_PROMPT },
      { role: "user", content: PLANE_TASK_USER_PROMPT(rawInput) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "plane_tasks",
        strict: false,
        schema: buildGroqJsonSchema(),
      },
    },
    temperature: 0.3,
    max_tokens: MAX_COMPLETION_TOKENS,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  return parseGroqContent(content);
}

async function requestJsonObject(
  groq: Groq,
  model: string,
  rawInput: string,
): Promise<GroqTaskOutput> {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `${PLANE_TASK_SYSTEM_PROMPT}\n\n${JSON_SHAPE_PROMPT}`,
      },
      { role: "user", content: PLANE_TASK_USER_PROMPT(rawInput) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: MAX_COMPLETION_TOKENS,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  return parseGroqContent(content);
}

function isJsonSchemaUnsupported(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("json_schema") ||
    error.message.includes("response format") ||
    error.message.includes("response_format")
  );
}

export async function parseTasksWithGroq(rawInput: string): Promise<GroqTaskOutput> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  if (supportsJsonSchema(model)) {
    try {
      return await requestJsonSchema(groq, model, rawInput);
    } catch (error) {
      if (!isJsonSchemaUnsupported(error)) {
        throw error;
      }
    }
  }

  return requestJsonObject(groq, model, rawInput);
}
