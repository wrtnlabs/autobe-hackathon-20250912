import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete a learning path item by ID in a specific learning path.
 *
 * This endpoint permanently removes the specified learning path item from the
 * learning path identified by learningPathId.
 *
 * Authorization: Only an organization administrator associated with the tenant
 * that owns the learning path may perform this operation.
 *
 * On successful deletion, no response body is returned.
 *
 * @param props - Object containing required parameters
 * @param props.organizationAdmin - The authenticated organization administrator
 * @param props.learningPathId - UUID of the learning path
 * @param props.learningPathItemId - UUID of the learning path item to delete
 * @throws {Error} If the learning path, learning path item is not found or if
 *   authorization fails
 */
export async function deleteenterpriseLmsOrganizationAdminLearningPathsLearningPathIdLearningPathItemsLearningPathItemId(props: {
  organizationAdmin: OrganizationadminPayload;
  learningPathId: string & tags.Format<"uuid">;
  learningPathItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, learningPathId, learningPathItemId } = props;

  // Fetch organizationAdmin from database to get tenant_id
  const adminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
    });

  if (!adminRecord) {
    throw new Error("Unauthorized: organizationAdmin not found");
  }

  const tenantId = adminRecord.tenant_id;

  // Fetch the learning path and verify tenant ownership
  const learningPath =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findUnique({
      where: { id: learningPathId },
    });

  if (!learningPath) {
    throw new Error("Learning path not found");
  }

  if (learningPath.tenant_id !== tenantId) {
    throw new Error(
      "Unauthorized: Learning path does not belong to your tenant",
    );
  }

  // Verify the learning path item exists and belongs to the learning path
  const learningPathItem =
    await MyGlobal.prisma.enterprise_lms_learning_path_items.findFirst({
      where: {
        id: learningPathItemId,
        learning_path_id: learningPathId,
      },
    });

  if (!learningPathItem) {
    throw new Error("Learning path item not found");
  }

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_learning_path_items.delete({
    where: { id: learningPathItemId },
  });
}
