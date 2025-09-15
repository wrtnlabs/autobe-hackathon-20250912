import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Creates a new discussion forum for the Enterprise LMS tenant organization.
 *
 * This operation allows an authorized organization administrator to create a
 * forum scoped to their tenant. The forum must have a unique name within the
 * tenant. It supports an optional description, tenant and ownership
 * association, and proper timestamp handling.
 *
 * Authorization is enforced by verifying the organization administrator's
 * tenant association matches the forum tenant.
 *
 * @param props - The props object containing the organizationAdmin and forum
 *   creation body.
 * @param props.organizationAdmin - The authenticated organization administrator
 *   payload.
 * @param props.body - The forum creation data including tenant and owner IDs,
 *   name, and optional description.
 * @returns The created forum record conforming to the IEnterpriseLmsForums
 *   interface.
 * @throws {Error} When the organization administrator is unauthorized or not
 *   found.
 * @throws {Error} When a forum with the same name already exists within the
 *   tenant.
 */
export async function postenterpriseLmsOrganizationAdminForums(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsForums.ICreate;
}): Promise<IEnterpriseLmsForums> {
  const { organizationAdmin, body } = props;

  // Authorization check: organizationAdmin must belong to tenant
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
    });
  if (!admin) throw new Error("Unauthorized: admin not found");
  if (admin.tenant_id !== body.tenant_id) {
    throw new Error("Unauthorized: organization admin tenant mismatch");
  }

  // Check uniqueness of forum name per tenant
  const existingForum = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
    where: {
      tenant_id: body.tenant_id,
      name: body.name,
    },
  });

  if (existingForum) {
    throw new Error(`Forum name '${body.name}' already exists in this tenant.`);
  }

  const now = toISOStringSafe(new Date());

  // Create forum entry
  const created = await MyGlobal.prisma.enterprise_lms_forums.create({
    data: {
      id: v4(),
      tenant_id: body.tenant_id,
      owner_id: body.owner_id,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    owner_id: created.owner_id,
    name: created.name,
    description: created.description ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
