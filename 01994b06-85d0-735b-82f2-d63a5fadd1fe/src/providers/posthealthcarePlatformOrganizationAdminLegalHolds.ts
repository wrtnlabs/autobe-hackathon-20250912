import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new legal hold entry for regulatory, investigatory, or litigation
 * events.
 *
 * This API creates a new entry in the healthcare_platform_legal_holds table,
 * representing a compliance/legal hold on organizational data. Used for
 * eDiscovery, litigation, audits, and regulatory lockdowns, this hold freezes
 * access/modification for the indicated subject, asset, or organizational
 * scope—preventing changes until resolved. Only authorized organization admins
 * can create legal holds. The entry records full justification, target,
 * timestamps, and workflow fields for audit and compliance.
 *
 * @param props - Function parameters
 * @param props.organizationAdmin - The authenticated organization admin
 *   initiating the legal hold
 * @param props.body - The request defining organization, imposed_by, subject
 *   type and id, method, reason, status, and effective/release times
 * @returns The fully populated legal hold record, including id, scope,
 *   metadata, and audit timestamps
 * @throws {Error} If duplicate legal hold already exists, or if Prisma/DB
 *   errors occur
 */
export async function posthealthcarePlatformOrganizationAdminLegalHolds(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLegalHold.ICreate;
}): Promise<IHealthcarePlatformLegalHold> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.healthcare_platform_legal_holds.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: props.body.organization_id,
      imposed_by_id: props.body.imposed_by_id ?? null,
      department_id: props.body.department_id ?? null,
      subject_type: props.body.subject_type,
      subject_id: props.body.subject_id ?? null,
      reason: props.body.reason,
      method: props.body.method,
      status: props.body.status,
      effective_at: toISOStringSafe(props.body.effective_at),
      release_at: props.body.release_at
        ? toISOStringSafe(props.body.release_at)
        : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    organization_id: created.organization_id,
    imposed_by_id: created.imposed_by_id ?? undefined,
    department_id: created.department_id ?? undefined,
    subject_type: created.subject_type,
    subject_id: created.subject_id ?? undefined,
    reason: created.reason,
    method: created.method,
    status: created.status,
    effective_at: toISOStringSafe(created.effective_at),
    release_at: created.release_at
      ? toISOStringSafe(created.release_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
