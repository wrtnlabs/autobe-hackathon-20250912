import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Update an existing external learner account
 *
 * Updates properties such as email, password hash, first name, last name,
 * status, and soft delete timestamp.
 *
 * Authorization is enforced by verifying tenant ownership of the target
 * external learner. Throws error if the external learner does not exist or
 * tenant mismatches.
 *
 * @param props - Object containing:
 *
 *   - ExternalLearner: Authenticated external learner's payload
 *   - ExternallearnerId: UUID of the external learner to update
 *   - Body: Partial update data for the external learner
 *
 * @returns Promise resolving to the updated external learner data
 * @throws Error when external learner not found or unauthorized access due to
 *   tenant mismatch
 */
export async function putenterpriseLmsExternalLearnerExternallearnersExternallearnerId(props: {
  externalLearner: ExternallearnerPayload;
  externallearnerId: string;
  body: IEnterpriseLmsExternalLearner.IUpdate;
}): Promise<IEnterpriseLmsExternalLearner> {
  const { externalLearner, externallearnerId, body } = props;

  // Fetch existing external learner
  const existing =
    await MyGlobal.prisma.enterprise_lms_externallearner.findUnique({
      where: { id: externallearnerId },
    });

  if (!existing) {
    throw new Error("External learner not found");
  }

  // Check tenant authorization
  if (existing.tenant_id !== externalLearner.tenant_id) {
    throw new Error("Unauthorized: Tenant ID mismatch");
  }

  // Prepare update data
  const updateData: IEnterpriseLmsExternalLearner.IUpdate = {};
  if (body.email !== undefined) updateData.email = body.email;
  if (body.password_hash !== undefined)
    updateData.password_hash = body.password_hash;
  if (body.first_name !== undefined) updateData.first_name = body.first_name;
  if (body.last_name !== undefined) updateData.last_name = body.last_name;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.deleted_at !== undefined) updateData.deleted_at = body.deleted_at;

  // Update record
  const updated = await MyGlobal.prisma.enterprise_lms_externallearner.update({
    where: { id: externallearnerId },
    data: updateData,
  });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    email: updated.email,
    password_hash: updated.password_hash,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
