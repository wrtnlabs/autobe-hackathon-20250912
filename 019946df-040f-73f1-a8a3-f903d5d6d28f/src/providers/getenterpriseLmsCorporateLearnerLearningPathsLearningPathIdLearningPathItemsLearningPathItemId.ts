import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve detailed information about a specific learning path item by its ID
 * within a given learning path.
 *
 * This operation returns all properties associated with the learning path item,
 * such as item type, item ID, and its sequence order. Access control relies on
 * the authenticated corporateLearner ensuring the tenant context is correct.
 *
 * @param props - Object containing authentication payload and path parameters.
 * @param props.corporateLearner - Authenticated corporate learner payload with
 *   id and type.
 * @param props.learningPathId - UUID of the learning path.
 * @param props.learningPathItemId - UUID of the learning path item.
 * @returns Detailed learning path item information conforming to
 *   IEnterpriseLmsLearningPathItem.
 * @throws {Error} Throws if the learning path item is not found.
 */
export async function getenterpriseLmsCorporateLearnerLearningPathsLearningPathIdLearningPathItemsLearningPathItemId(props: {
  corporateLearner: CorporatelearnerPayload;
  learningPathId: string & tags.Format<"uuid">;
  learningPathItemId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsLearningPathItem> {
  const { corporateLearner, learningPathId, learningPathItemId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_learning_path_items.findFirstOrThrow({
      where: {
        id: learningPathItemId,
        learning_path_id: learningPathId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    learning_path_id: record.learning_path_id,
    item_type: record.item_type,
    item_id: record.item_id,
    sequence_order: record.sequence_order,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
