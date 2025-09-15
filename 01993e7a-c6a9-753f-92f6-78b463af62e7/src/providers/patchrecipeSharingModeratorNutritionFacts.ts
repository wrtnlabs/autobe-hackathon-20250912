import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import { IPageIRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingNutritionFact";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Search and list nutrition facts with filtering and pagination
 *
 * Retrieves a paginated list of nutrition facts for ingredients from the
 * recipe_sharing_nutrition_facts table. Allows filtering by ingredient ID,
 * optional search (not applied because no text fields exist), and sorting by
 * allowed fields. Only accessible by moderators due to the use of
 * ModeratorPayload for authorization.
 *
 * @param props - Object containing moderator authentication and request body.
 * @param props.moderator - The authenticated moderator making the request.
 * @param props.body - The search criteria and pagination parameters.
 * @returns Paginated list of nutrition fact summaries matching the criteria.
 * @throws {Error} Throws if database operation fails.
 */
export async function patchrecipeSharingModeratorNutritionFacts(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingNutritionFact.IRequest;
}): Promise<IPageIRecipeSharingNutritionFact.ISummary> {
  const { moderator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {} = {};
  if (body.ingredient_id !== undefined && body.ingredient_id !== null) {
    (where as any).ingredient_id = body.ingredient_id;
  }

  // No text search because no text fields exist in nutrition facts

  const validOrderFields = [
    "calories",
    "protein",
    "carbohydrates",
    "fat",
    "fiber",
    "sodium",
    "sugar",
    "vitamin_a",
    "vitamin_c",
    "vitamin_d",
    "iron",
    "calcium",
    "created_at",
    "updated_at",
  ];

  const orderByField = validOrderFields.includes(body.order_by ?? "")
    ? (body.order_by ?? "created_at")
    : "created_at";

  const orderBy: {} = {};
  (orderBy as any)[orderByField] = "desc";

  const [records, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_nutrition_facts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_nutrition_facts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((rec) => ({
      id: rec.id,
      ingredient_id: rec.ingredient_id,
      calories: rec.calories,
      protein: rec.protein,
      carbohydrates: rec.carbohydrates,
      fat: rec.fat,
      fiber: rec.fiber,
      sodium: rec.sodium,
      sugar: rec.sugar,
      vitamin_a: rec.vitamin_a ?? null,
      vitamin_c: rec.vitamin_c ?? null,
      vitamin_d: rec.vitamin_d ?? null,
      iron: rec.iron ?? null,
      calcium: rec.calcium ?? null,
      created_at: toISOStringSafe(rec.created_at),
      updated_at: toISOStringSafe(rec.updated_at),
    })),
  };
}
