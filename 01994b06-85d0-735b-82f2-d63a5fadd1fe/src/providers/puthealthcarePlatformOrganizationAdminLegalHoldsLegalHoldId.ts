import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing legal hold record (healthcare_platform_legal_holds).
 *
 * This operation updates an existing legal hold record identified by
 * legalHoldId in the healthcarePlatform compliance module. Legal holds are used
 * to restrict access to certain data due to legal, regulatory, or investigatory
 * needs. Modifies status, effective/release times, rationale, status, or other
 * allowable fields. All updates are audited and restricted.
 *
 * Security:
 *
 * - Only organization admins may update the record for their own organization.
 * - Attempts to update non-existent/deleted, or out-of-org records are forbidden.
 *
 * @param props - Operation properties
 * @param props.organizationAdmin - Authenticated organization admin user
 * @param props.legalHoldId - UUID of legal hold to update
 * @param props.body - Partial update payload
 *   (IHealthcarePlatformLegalHold.IUpdate)
 * @returns IHealthcarePlatformLegalHold (full, updated legal hold record)
 * @throws {Error} If not found or not authorized
 */
export async function puthealthcarePlatformOrganizationAdminLegalHoldsLegalHoldId(props: {
  organizationAdmin: OrganizationadminPayload;
  legalHoldId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLegalHold.IUpdate;
}): Promise<IHealthcarePlatformLegalHold> {
  const { organizationAdmin, legalHoldId, body } = props;

  // Find record (must NOT be soft deleted)
  const record =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: { id: legalHoldId, deleted_at: null },
    });
  if (record === null) {
    throw new Error("Legal hold not found or has been deleted.");
  }

  // Authorization: can only update for own org
  if (record.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Forbidden: Cannot update legal hold outside your organization.",
    );
  }

  // Carefully build updates: skip undefined, assign null, update_at always
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_legal_holds.update({
    where: { id: legalHoldId },
    data: {
      ...(body.imposed_by_id !== undefined
        ? { imposed_by_id: body.imposed_by_id }
        : {}),
      ...(body.department_id !== undefined
        ? { department_id: body.department_id }
        : {}),
      ...(body.subject_type !== undefined
        ? { subject_type: body.subject_type }
        : {}),
      ...(body.subject_id !== undefined ? { subject_id: body.subject_id } : {}),
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
      ...(body.method !== undefined ? { method: body.method } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.effective_at !== undefined
        ? { effective_at: body.effective_at }
        : {}),
      ...(body.release_at !== undefined ? { release_at: body.release_at } : {}),
      updated_at: now,
    },
  });

  // Fetch again to get post-update values
  const updated =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findUniqueOrThrow({
      where: { id: legalHoldId },
    });

  return {
    id: updated.id,
    organization_id: updated.organization_id,
    imposed_by_id:
      updated.imposed_by_id !== null && updated.imposed_by_id !== undefined
        ? updated.imposed_by_id
        : undefined,
    department_id:
      updated.department_id !== null && updated.department_id !== undefined
        ? updated.department_id
        : undefined,
    subject_type: updated.subject_type,
    subject_id:
      updated.subject_id !== null && updated.subject_id !== undefined
        ? updated.subject_id
        : undefined,
    reason: updated.reason,
    method: updated.method,
    status: updated.status,
    effective_at: toISOStringSafe(updated.effective_at),
    release_at:
      updated.release_at !== null && updated.release_at !== undefined
        ? toISOStringSafe(updated.release_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
