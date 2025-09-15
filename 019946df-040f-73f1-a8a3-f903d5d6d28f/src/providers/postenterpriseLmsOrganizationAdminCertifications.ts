import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new certification record under a tenant organization.
 *
 * This operation requires an authenticated organization admin and ensures that
 * certification codes are unique within the tenant scope.
 *
 * @param props - Object containing the authenticated organization admin and
 *   certification creation data
 * @param props.organizationAdmin - Authenticated organization admin performing
 *   the operation
 * @param props.body - Certification creation data conforming to
 *   IEnterpriseLmsCertification.ICreate
 * @returns The created certification record with full details
 * @throws {Error} When a certification with the same code already exists within
 *   the tenant
 */
export async function postenterpriseLmsOrganizationAdminCertifications(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCertification.ICreate;
}): Promise<IEnterpriseLmsCertification> {
  const { organizationAdmin, body } = props;

  // Check if a certification with the same code exists for the tenant
  const existing =
    await MyGlobal.prisma.enterprise_lms_certifications.findFirst({
      where: {
        tenant_id: body.tenant_id,
        code: body.code,
      },
    });
  if (existing !== null) {
    throw new Error(
      `Certification code '${body.code}' already exists for tenant.`,
    );
  }

  // Generate UUID and current timestamps
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the certification record
  const created = await MyGlobal.prisma.enterprise_lms_certifications.create({
    data: {
      id,
      tenant_id: body.tenant_id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created certification with proper date and nullable handling
  return {
    id: created.id,
    tenant_id: created.tenant_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
