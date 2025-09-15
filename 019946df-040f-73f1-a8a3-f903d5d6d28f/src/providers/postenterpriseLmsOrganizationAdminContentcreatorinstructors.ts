import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new content creator/instructor account within the enterprise LMS.
 *
 * This operation requires authorization as an organization administrator. It
 * validates that the tenant_id in the request body matches the tenant_id of the
 * organization admin for security.
 *
 * On success, it returns the full created user record with timestamps as ISO
 * strings.
 *
 * @param props - Props containing the authenticated organization admin and the
 *   creation data
 * @returns The newly created content creator/instructor record
 * @throws {Error} If tenant_id does not match, an unauthorized error is thrown
 * @throws Prisma errors on uniqueness or validation failure
 */
export async function postenterpriseLmsOrganizationAdminContentcreatorinstructors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsContentCreatorInstructor.ICreate;
}): Promise<IEnterpriseLmsContentCreatorInstructor> {
  const { organizationAdmin, body } = props;

  if (organizationAdmin.tenant_id !== body.tenant_id) {
    throw new Error("Unauthorized: Tenant ID mismatch");
  }

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.create({
      data: {
        id: newId,
        tenant_id: body.tenant_id,
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
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
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
