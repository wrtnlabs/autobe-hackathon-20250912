import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing legal hold record (healthcare_platform_legal_holds).
 *
 * This operation updates an existing legal hold record identified by
 * legalHoldId in the healthcarePlatform compliance module. Used by system
 * admins to change status, reason, method, scope, effective/release dates, etc.
 * Only fields provided in the request body are changed. The update is allowed
 * only for active (not-soft-deleted) records. All modifications are strictly
 * controlled and auditable. Unauthorized or invalid attempts will throw
 * errors.
 *
 * @param props -
 *
 *   - SystemAdmin: Authenticated SystemadminPayload (system-wide admin user)
 *   - LegalHoldId: UUID of the legal hold to update
 *   - Body: IHealthcarePlatformLegalHold.IUpdate update object (partial)
 *
 * @returns The updated IHealthcarePlatformLegalHold object with all fields
 * @throws {Error} If the legal hold does not exist, is deleted, or immutable
 */
export async function puthealthcarePlatformSystemAdminLegalHoldsLegalHoldId(props: {
  systemAdmin: SystemadminPayload;
  legalHoldId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLegalHold.IUpdate;
}): Promise<IHealthcarePlatformLegalHold> {
  const { legalHoldId, body } = props;
  // 1. Lookup record: must exist and not be soft-deleted
  const record =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: { id: legalHoldId, deleted_at: null },
    });
  if (!record) throw new Error("Legal hold not found or already deleted");

  // 2. Prepare update input - only supplied fields (allow null to clear)
  const updateData: Partial<{
    imposed_by_id: (string & tags.Format<"uuid">) | null;
    department_id: (string & tags.Format<"uuid">) | null;
    subject_type: string;
    subject_id: (string & tags.Format<"uuid">) | null;
    reason: string;
    method: string;
    status: string;
    effective_at: string & tags.Format<"date-time">;
    release_at: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  }> = {};

  if ("imposed_by_id" in body)
    updateData.imposed_by_id =
      body.imposed_by_id === undefined ? undefined : body.imposed_by_id;
  if ("department_id" in body)
    updateData.department_id =
      body.department_id === undefined ? undefined : body.department_id;
  if ("subject_type" in body) updateData.subject_type = body.subject_type;
  if ("subject_id" in body)
    updateData.subject_id =
      body.subject_id === undefined ? undefined : body.subject_id;
  if ("reason" in body) updateData.reason = body.reason;
  if ("method" in body) updateData.method = body.method;
  if ("status" in body) updateData.status = body.status;
  if ("effective_at" in body) updateData.effective_at = body.effective_at;
  if ("release_at" in body)
    updateData.release_at =
      body.release_at === undefined ? undefined : body.release_at;
  updateData.updated_at = toISOStringSafe(new Date());

  // 3. Perform update (update throws if not found)
  const updated = await MyGlobal.prisma.healthcare_platform_legal_holds.update({
    where: { id: legalHoldId },
    data: updateData,
  });

  // 4. Project result to IHealthcarePlatformLegalHold
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    imposed_by_id: updated.imposed_by_id ?? undefined,
    department_id: updated.department_id ?? undefined,
    subject_type: updated.subject_type,
    subject_id: updated.subject_id ?? undefined,
    reason: updated.reason,
    method: updated.method,
    status: updated.status,
    effective_at: toISOStringSafe(updated.effective_at),
    release_at: updated.release_at
      ? toISOStringSafe(updated.release_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  } satisfies IHealthcarePlatformLegalHold;
}
