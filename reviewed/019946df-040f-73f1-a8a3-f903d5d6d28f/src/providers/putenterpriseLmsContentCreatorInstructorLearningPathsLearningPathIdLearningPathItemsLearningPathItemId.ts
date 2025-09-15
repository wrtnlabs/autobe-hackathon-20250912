import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing learning path item identified by its ID within a specified
 * learning path.
 *
 * This operation ensures the authenticated content creator/instructor belongs
 * to the tenant owning the learning path. It updates mutable properties such as
 * item type, item ID, sequence order, and soft deletion timestamp.
 *
 * @param props - Object containing authenticated user, path parameters, and
 *   update body
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor payload
 * @param props.learningPathId - UUID of the learning path to update
 * @param props.learningPathItemId - UUID of the learning path item to update
 * @param props.body - Partial updates for the learning path item
 * @returns The updated learning path item object
 * @throws {Error} If user is unauthorized or learning path/item not found or
 *   mismatched
 */
export async function putenterpriseLmsContentCreatorInstructorLearningPathsLearningPathIdLearningPathItemsLearningPathItemId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  learningPathId: string & tags.Format<"uuid">;
  learningPathItemId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsLearningPathItem.IUpdate;
}): Promise<IEnterpriseLmsLearningPathItem> {
  const { contentCreatorInstructor, learningPathId, learningPathItemId, body } =
    props;

  const learningPath =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findUniqueOrThrow({
      where: { id: learningPathId },
      select: { id: true, tenant_id: true },
    });

  if (contentCreatorInstructor.id !== learningPath.tenant_id) {
    throw new Error(
      "Unauthorized: You do not belong to the tenant owning the learning path",
    );
  }

  const learningPathItem =
    await MyGlobal.prisma.enterprise_lms_learning_path_items.findUniqueOrThrow({
      where: { id: learningPathItemId },
    });

  if (learningPathItem.learning_path_id !== learningPathId) {
    throw new Error(
      "Learning path item does not belong to the specified learning path",
    );
  }

  const updateData: IEnterpriseLmsLearningPathItem.IUpdate = {};

  if (body.learning_path_id !== undefined && body.learning_path_id !== null) {
    updateData.learning_path_id = body.learning_path_id;
  }

  if (body.item_type !== undefined && body.item_type !== null) {
    updateData.item_type = body.item_type;
  }

  if (body.item_id !== undefined && body.item_id !== null) {
    updateData.item_id = body.item_id;
  }

  if (body.sequence_order !== undefined && body.sequence_order !== null) {
    updateData.sequence_order = body.sequence_order;
  }

  if (body.deleted_at !== undefined) {
    updateData.deleted_at = body.deleted_at; // can be null explicitly
  }

  updateData.updated_at = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.enterprise_lms_learning_path_items.update({
      where: { id: learningPathItemId },
      data: updateData,
    });

  return {
    id: updated.id,
    learning_path_id: updated.learning_path_id,
    item_type: updated.item_type,
    item_id: updated.item_id,
    sequence_order: updated.sequence_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
