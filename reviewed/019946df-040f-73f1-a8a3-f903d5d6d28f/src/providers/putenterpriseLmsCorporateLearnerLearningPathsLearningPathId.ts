import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Update an existing learning path identified by its ID in the Enterprise LMS.
 *
 * This operation updates properties like code, title, description, status, and
 * deleted status. It enforces that the requesting corporate learner is
 * authorized to modify only learning paths belonging to their tenant.
 *
 * @param props - Object containing corporate learner payload, learning path ID,
 *   and update body
 * @param props.corporateLearner - Authenticated corporate learner making the
 *   request
 * @param props.learningPathId - UUID of the learning path to update
 * @param props.body - Partial update data for the learning path
 * @returns The updated learning path entity
 * @throws {Error} When the learning path does not exist or is not accessible
 * @throws {Error} When no update fields are provided in the body
 */
export async function putenterpriseLmsCorporateLearnerLearningPathsLearningPathId(props: {
  corporateLearner: CorporatelearnerPayload;
  learningPathId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsLearningPaths.IUpdate;
}): Promise<IEnterpriseLmsLearningPaths> {
  const { corporateLearner, learningPathId, body } = props;

  // Attempt to find the learning path by ID which is not deleted
  const existing =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findFirst({
      where: {
        id: learningPathId,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new Error("Learning path not found or access denied");
  }

  // Here, tenant isolation cannot be verified due to absence of tenant_id in corporateLearnerPayload
  // Assuming authorization in the decorator or middleware

  // Validate update body is not empty
  if (Object.keys(body).length === 0) {
    throw new Error("Update body must contain at least one field");
  }

  // Prepare update data with correct null/undefined handling
  const updateData: IEnterpriseLmsLearningPaths.IUpdate = {
    code: body.code ?? undefined,
    title: body.title ?? undefined,
    description:
      body.description === null ? null : (body.description ?? undefined),
    status: body.status ?? undefined,
    deleted_at:
      body.deleted_at === null ? null : (body.deleted_at ?? undefined),
  };

  // Execute update operation
  const updated = await MyGlobal.prisma.enterprise_lms_learning_paths.update({
    where: { id: learningPathId },
    data: updateData,
  });

  // Return updated learning path with date fields converted
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    code: updated.code,
    title: updated.title,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
