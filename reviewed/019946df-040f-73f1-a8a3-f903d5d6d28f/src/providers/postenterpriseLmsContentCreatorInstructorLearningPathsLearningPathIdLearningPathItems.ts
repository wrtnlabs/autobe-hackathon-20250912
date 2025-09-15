import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new learning path item for a specified learning path.
 *
 * This operation creates a new learning path item associated with a specified
 * learning path in the enterprise LMS. The item represents a curriculum element
 * such as a course, module, or assessment, and enforces tenant data isolation.
 * Only content creator/instructor users belonging to the tenant can create
 * items.
 *
 * @param props - Object containing contentCreatorInstructor, learningPathId,
 *   and the learning path item data
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor payload
 * @param props.learningPathId - UUID of the target learning path
 * @param props.body - Creation data for the new learning path item
 * @returns Newly created learning path item with all properties
 * @throws {Error} Throws error if learning path is not found or tenant is
 *   unauthorized
 */
export async function postenterpriseLmsContentCreatorInstructorLearningPathsLearningPathIdLearningPathItems(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  learningPathId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsLearningPathItem.ICreate;
}): Promise<IEnterpriseLmsLearningPathItem> {
  const { contentCreatorInstructor, learningPathId, body } = props;

  // Fetch the learning path record
  const learningPath =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findUnique({
      where: { id: learningPathId },
    });

  if (!learningPath) {
    throw new Error("Learning path not found");
  }

  // Fetch the content creator/instructor record to validate tenant affiliation
  const creator =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUnique({
      where: { id: contentCreatorInstructor.id },
    });

  if (!creator) {
    throw new Error("Content creator/instructor not found");
  }

  // Check tenant isolation
  if (creator.tenant_id !== learningPath.tenant_id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  // Generate new item id and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the new learning path item record
  const created =
    await MyGlobal.prisma.enterprise_lms_learning_path_items.create({
      data: {
        id,
        learning_path_id: learningPathId,
        item_type: body.item_type,
        item_id: body.item_id,
        sequence_order: body.sequence_order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return the created item with converted dates
  return {
    id: created.id,
    learning_path_id: created.learning_path_id,
    item_type: created.item_type,
    item_id: created.item_id,
    sequence_order: created.sequence_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
