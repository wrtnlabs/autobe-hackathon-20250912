import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new legal hold entry for regulatory, investigatory, or litigation
 * events (healthcare_platform_legal_holds).
 *
 * This endpoint allows a system administrator to create a new legal hold within
 * the healthcarePlatform compliance module. Legal holds are used to freeze
 * access to data (such as patient records, organization documents, or audit
 * trails) when regulatory, legal, or investigatory events require information
 * retention and access restriction. This operation captures all compliance and
 * audit metadata, links the hold to the relevant organization and entities, and
 * sets effective and release windows. Only authorized admins can perform this
 * action.
 *
 * Authorization: Requires systemAdmin role (SystemadminPayload). Only
 * platform-level admins can create holds across organizations.
 *
 * @param props - Parameters required to create a legal hold
 * @param props.systemAdmin - The authenticated system administrator creating
 *   the hold
 * @param props.body - Legal hold metadata, justification, and scope
 *   (organization_id, subject_type, method, etc.)
 * @returns Newly created legal hold object with full audit and compliance
 *   metadata
 * @throws {Error} If subject_type is 'system_core' (protected)
 * @throws {Error} If organization_id is not a valid UUID
 */
export async function posthealthcarePlatformSystemAdminLegalHolds(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformLegalHold.ICreate;
}): Promise<IHealthcarePlatformLegalHold> {
  // Reject forbidden subject_type
  if (props.body.subject_type === "system_core") {
    throw new Error(
      'Creating a legal hold for subject_type "system_core" is forbidden.',
    );
  }
  // Validate organization_id (must be a valid UUID)
  typia.assert<IHealthcarePlatformLegalHold.ICreate>(props.body);

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
      effective_at: props.body.effective_at,
      release_at: props.body.release_at ?? null,
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
