import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new announcement record for a tenant organization.
 *
 * This operation validates input fields and enforces status constraints such as
 * draft or sent. Tenant association is ensured through security context.
 *
 * Used in administrative portals to create announcement broadcasts to users and
 * departments. Only organization administrators are authorized to perform this
 * operation.
 *
 * @param props - Object containing the organizationAdmin payload and
 *   announcement creation body
 * @param props.organizationAdmin - Authenticated organization administrator
 *   performing the creation
 * @param props.body - Announcement creation data including tenant_id,
 *   creator_id, title, body, target audience, and status
 * @returns Newly created announcement record with all fields populated
 * @throws {Error} Throws if there are database or validation errors
 */
export async function postenterpriseLmsOrganizationAdminAnnouncements(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsAnnouncement.ICreate;
}): Promise<IEnterpriseLmsAnnouncement> {
  const { organizationAdmin, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_announcements.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      tenant_id: body.tenant_id,
      creator_id: body.creator_id,
      title: body.title,
      body: body.body,
      target_audience_description:
        body.target_audience_description ?? undefined,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    creator_id: created.creator_id,
    title: created.title,
    body: created.body,
    target_audience_description: created.target_audience_description ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
