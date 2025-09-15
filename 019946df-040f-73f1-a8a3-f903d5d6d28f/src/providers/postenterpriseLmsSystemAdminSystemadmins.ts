import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new system administrator user account in the Enterprise LMS system.
 *
 * This operation accepts creation details such as email, hashed password, first
 * name, last name, and status in the request body. It inserts a new record into
 * the enterprise_lms_systemadmin table with status indicating account state.
 *
 * Only users with the systemAdmin role can execute this operation.
 *
 * @param props - Object containing the authenticated systemAdmin user and
 *   creation body
 * @param props.systemAdmin - The authenticated systemAdmin payload
 * @param props.body - The creation details for the system administrator
 * @returns The fully detailed newly created system administrator record
 * @throws {Error} When email already exists
 */
export async function postenterpriseLmsSystemAdminSystemadmins(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSystemAdmin.ICreate;
}): Promise<IEnterpriseLmsSystemAdmin> {
  const { systemAdmin, body } = props;

  // Fetch tenant_id associated with the systemAdmin user
  const existingAdmin =
    await MyGlobal.prisma.enterprise_lms_systemadmin.findUnique({
      where: { id: systemAdmin.id },
      select: { tenant_id: true },
    });

  if (!existingAdmin) {
    throw new Error("Authenticated systemAdmin user not found");
  }
  const tenantId = existingAdmin.tenant_id;

  // Check for duplicate email (case insensitive)
  const duplicate = await MyGlobal.prisma.enterprise_lms_systemadmin.findFirst({
    where: {
      email: body.email,
    },
  });
  if (duplicate) throw new Error("Email already exists");

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_systemadmin.create({
    data: {
      id: v4() as string & import("typia").tags.Format<"uuid">,
      tenant_id: tenantId,
      email: body.email,
      password_hash: body.password_hash,
      first_name: body.first_name,
      last_name: body.last_name,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
