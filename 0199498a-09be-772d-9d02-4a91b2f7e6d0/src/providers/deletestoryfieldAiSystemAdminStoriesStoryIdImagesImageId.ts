import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Remove (soft delete) an image from a story as system admin.
 *
 * Soft-deletes a story image by setting its deleted_at field to the current
 * time. This action is permitted only for system admins. It verifies the system
 * admin account is active, confirms the image exists for the specified story,
 * and is not already deleted. If any condition is not met, an error is thrown.
 * The operation is compliant and audit-friendly, ensuring traceability.
 *
 * @param props - Parameters for deletion
 * @param props.systemAdmin - Authenticated system admin context. Must match an
 *   enabled system admin in DB.
 * @param props.storyId - UUID of the parent story (must match image's story).
 * @param props.imageId - UUID of the image to remove.
 * @returns Void
 * @throws {Error} If admin is missing or deleted, if image does not exist or is
 *   already deleted.
 */
export async function deletestoryfieldAiSystemAdminStoriesStoryIdImagesImageId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate system admin is active
  const admin = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: {
      id: props.systemAdmin.id,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new Error("System admin not found or deleted");
  }

  // 2. Validate the image exists for the given story and is not already deleted
  const image = await MyGlobal.prisma.storyfield_ai_story_images.findFirst({
    where: {
      id: props.imageId,
      storyfield_ai_story_id: props.storyId,
      deleted_at: null,
    },
  });
  if (!image) {
    throw new Error("Image not found in story or already deleted");
  }

  // 3. Soft-delete by updating the deleted_at field to now
  await MyGlobal.prisma.storyfield_ai_story_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // No return (void).
}
