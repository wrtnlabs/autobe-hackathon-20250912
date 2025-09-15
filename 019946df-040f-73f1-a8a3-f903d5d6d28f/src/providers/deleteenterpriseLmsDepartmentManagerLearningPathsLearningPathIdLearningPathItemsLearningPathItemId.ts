import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Delete a learning path item by ID within a specific learning path under the
 * authorization of a department manager.
 *
 * This function verifies that the department manager is authorized for the
 * tenant of the learning path, confirms the learning path and item exist and
 * are linked, and then performs a hard delete of the specified learning path
 * item.
 *
 * @param props - Object containing departmentManager auth info and path IDs
 * @param props.departmentManager - Authenticated department manager's info
 * @param props.learningPathId - UUID of the learning path
 * @param props.learningPathItemId - UUID of the learning path item to delete
 * @throws {Error} If learning path not found, unauthorized, or item not
 *   found/mismatch
 */
export async function deleteenterpriseLmsDepartmentManagerLearningPathsLearningPathIdLearningPathItemsLearningPathItemId(props: {
  departmentManager: DepartmentmanagerPayload;
  learningPathId: string & tags.Format<"uuid">;
  learningPathItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentManager, learningPathId, learningPathItemId } = props;

  // Step 1: Retrieve the department manager record to get the tenant_id
  const departmentManagerRecord =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUniqueOrThrow({
      where: { id: departmentManager.id },
      select: { tenant_id: true },
    });

  // Step 2: Retrieve the learning path and verify ownership
  const learningPath =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findUniqueOrThrow({
      where: { id: learningPathId },
      select: { tenant_id: true },
    });

  if (learningPath.tenant_id !== departmentManagerRecord.tenant_id) {
    throw new Error(
      "Unauthorized: department manager does not own the tenant for this learning path",
    );
  }

  // Step 3: Retrieve the learning path item and verify association
  const learningPathItem =
    await MyGlobal.prisma.enterprise_lms_learning_path_items.findUniqueOrThrow({
      where: { id: learningPathItemId },
      select: { learning_path_id: true },
    });

  if (learningPathItem.learning_path_id !== learningPathId) {
    throw new Error(
      "Learning path item does not belong to the specified learning path",
    );
  }

  // Step 4: Delete the learning path item (hard delete)
  await MyGlobal.prisma.enterprise_lms_learning_path_items.delete({
    where: { id: learningPathItemId },
  });
}
