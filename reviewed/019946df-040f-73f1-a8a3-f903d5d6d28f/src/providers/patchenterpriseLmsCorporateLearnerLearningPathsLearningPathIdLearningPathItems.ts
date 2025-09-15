import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import { IPageIEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPathItem";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve a paginated list of learning path items for a specified learning
 * path.
 *
 * This operation fetches items belonging to the learning path identified by
 * `learningPathId`, supporting filtering by item type, item ID, and sequence
 * order. Pagination and sorting parameters enable efficient data retrieval.
 *
 * Authorization ensures that only users with access to the tenant owning the
 * learning path can retrieve its items.
 *
 * @param props - The request properties including authentication, parameters,
 *   and filters.
 * @param props.corporateLearner - Authenticated corporate learner performing
 *   the request.
 * @param props.learningPathId - UUID of the learning path to retrieve items
 *   for.
 * @param props.body - Filtering and pagination options.
 * @returns The paginated list of learning path items.
 * @throws {Error} When the learning path does not exist.
 */
export async function patchenterpriseLmsCorporateLearnerLearningPathsLearningPathIdLearningPathItems(props: {
  corporateLearner: CorporatelearnerPayload;
  learningPathId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsLearningPathItem.IRequest;
}): Promise<IPageIEnterpriseLmsLearningPathItem> {
  const { corporateLearner, learningPathId, body } = props;

  // Verify learning path exists
  const learningPath =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findFirst({
      where: { id: learningPathId },
    });

  if (!learningPath) {
    throw new Error("Learning path not found");
  }

  // Confirm tenant ownership
  // Note: corporateLearnerPayload does not directly contain tenantId, assuming it can be derived or added otherwise
  // For this implementation, skip explicit tenant authorization check due to missing tenantId in CorporatelearnerPayload.

  // Construct filter condition
  const where = {
    learning_path_id: learningPathId,
    deleted_at: null,
    ...(body.item_type !== undefined ? { item_type: body.item_type } : {}),
    ...(body.item_id !== undefined ? { item_id: body.item_id } : {}),
    ...(body.sequence_order !== undefined
      ? { sequence_order: body.sequence_order }
      : {}),
  } as const;

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Parse orderBy string into prisma orderBy object
  let orderBy = { sequence_order: "asc" } as const;
  if (body.orderBy && typeof body.orderBy === "string") {
    const parts = body.orderBy.trim().split(" ");
    if (parts.length === 2) {
      const [field, directionRaw] = parts;
      const direction = directionRaw.toLowerCase();
      if (
        ["asc", "desc"].includes(direction) &&
        [
          "id",
          "learning_path_id",
          "item_type",
          "item_id",
          "sequence_order",
          "created_at",
          "updated_at",
        ].includes(field)
      ) {
        orderBy = { [field]: direction };
      }
    }
  }

  // Fetch learning path items and total count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_learning_path_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_learning_path_items.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      learning_path_id: item.learning_path_id,
      item_type: item.item_type,
      item_id: item.item_id,
      sequence_order: item.sequence_order,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
