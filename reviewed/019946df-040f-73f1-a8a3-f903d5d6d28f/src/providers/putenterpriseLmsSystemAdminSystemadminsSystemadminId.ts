import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a System Administrator user's information within the multi-tenant
 * enterprise LMS.
 *
 * This operation allows authorized users with system administrator roles to
 * modify account details such as email, password hash, first and last names,
 * and account status. It enforces multi-tenant security by verifying that the
 * authenticated user's tenant matches the target user's tenant. It updates the
 * targeted system administrator's record with the provided fields and sets the
 * updated_at timestamp to current time.
 *
 * @param props - Object containing authenticated systemAdmin user, target
 *   systemadminId, and update data body
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.systemadminId - UUID of the system admin to update
 * @param props.body - Update data for the system admin user
 * @returns Updated system administrator record reflecting all fields
 * @throws {Error} If authorization fails due to tenant mismatch
 * @throws {Error} If the target system administrator does not exist
 */
export async function putenterpriseLmsSystemAdminSystemadminsSystemadminId(props: {
  systemAdmin: SystemadminPayload;
  systemadminId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsSystemAdmin.IUpdate;
}): Promise<IEnterpriseLmsSystemAdmin> {
  const { systemAdmin, systemadminId, body } = props;

  // Fetch the authenticated system admin full record to get tenant_id
  const authAdmin =
    await MyGlobal.prisma.enterprise_lms_systemadmin.findUniqueOrThrow({
      where: { id: systemAdmin.id },
    });

  // Fetch the target system admin record to be updated
  const targetAdmin =
    await MyGlobal.prisma.enterprise_lms_systemadmin.findUniqueOrThrow({
      where: { id: systemadminId },
    });

  // Enforce multi-tenant authorization
  if (targetAdmin.tenant_id !== authAdmin.tenant_id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  // Update the target system admin
  const updated = await MyGlobal.prisma.enterprise_lms_systemadmin.update({
    where: { id: systemadminId },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      first_name: body.first_name ?? undefined,
      last_name: body.last_name ?? undefined,
      status: body.status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
    },
  });

  // Return updated user with all date fields converted to ISO string
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
