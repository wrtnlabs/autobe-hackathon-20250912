import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update details of a specific system admin account
 * (ats_recruitment_systemadmins table) by systemAdminId.
 *
 * This operation allows privileged system administrators to update another
 * system admin account in the ATS management platform. The update supports
 * modifying business attributes such as name, super_admin status, is_active
 * status, and email address, but it cannot be used for sensitive data fields
 * unless specifically enabled by additional security steps.
 *
 * SystemAdminId serves as the unique identifier for the account, and the API
 * expects a well-formed update payload matching platform validation. The system
 * enforces strict access controls, only allowing updates by active authorized
 * systemAdmin role users. All update attempts and changes are tracked via audit
 * logs, recording before/after record states and actor identity for full
 * traceability.
 *
 * Invalid fields, access attempts on non-existent or deleted accounts, or
 * unauthorized update attempts are handled with clear error feedback. This
 * endpoint supports downstream business requirements for privileged account
 * lifecycle, deactivation, and security management.
 *
 * @param props - Object containing parameters for the update operation
 * @param props.systemAdmin - The authenticated system admin performing the
 *   update
 * @param props.systemAdminId - Unique identifier (UUID) for the system
 *   administrator being updated
 * @param props.body - Update information for the admin account (business fields
 *   only, not for sensitive credentials)
 * @returns Updated record for the specified system administrator
 * @throws {Error} When attempted update is on a non-existent, deleted, or
 *   unauthorized admin, or violates unique constraints.
 */
export async function putatsRecruitmentSystemAdminSystemAdminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentSystemAdmin.IUpdate;
}): Promise<IAtsRecruitmentSystemAdmin> {
  const { systemAdmin, systemAdminId, body } = props;

  // Step 1: Fetch the target system admin account (must exist and not be deleted)
  const admin = await MyGlobal.prisma.ats_recruitment_systemadmins.findFirst({
    where: {
      id: systemAdminId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new Error("System admin not found or inactive/deleted.");
  }

  // Step 2: Prepare update data; only allowed fields can be updated
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 3: Attempt to update (Prisma enforces unique constraints, propagates error if email duplicate)
  const updated = await MyGlobal.prisma.ats_recruitment_systemadmins.update({
    where: { id: systemAdminId },
    data: {
      email: body.email ?? undefined,
      name: body.name ?? undefined,
      super_admin: body.super_admin ?? undefined,
      is_active: body.is_active ?? undefined,
      updated_at: now,
    },
  });

  // Step 4: Return result in strict IAtsRecruitmentSystemAdmin shape, with branded string date-times.
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    super_admin: updated.super_admin,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
