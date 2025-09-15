import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing announcement by ID.
 *
 * This function updates the announcement metadata fields such as title, body,
 * target audience description, and status. It ensures the announcement exists,
 * is not deleted, and belongs to the same tenant as the authenticated
 * organization administrator.
 *
 * @param props - Object containing the authenticated organization admin,
 *   announcement ID, and update data.
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the update.
 * @param props.announcementId - Unique identifier of the announcement to
 *   update.
 * @param props.body - The update payload containing new announcement details.
 * @returns The updated announcement information conforming to
 *   IEnterpriseLmsAnnouncement.
 * @throws {Error} If the announcement does not exist or has been soft deleted.
 * @throws {Error} If the authenticated admin is unauthorized to update the
 *   announcement.
 */
export async function putenterpriseLmsOrganizationAdminAnnouncementsAnnouncementId(props: {
  organizationAdmin: OrganizationadminPayload;
  announcementId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAnnouncement.IUpdate;
}): Promise<IEnterpriseLmsAnnouncement> {
  const { organizationAdmin, announcementId, body } = props;

  // Fetch organization admin tenant_id
  const orgAdmin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  // Fetch announcement
  const announcement =
    await MyGlobal.prisma.enterprise_lms_announcements.findUniqueOrThrow({
      where: { id: announcementId },
      select: {
        id: true,
        tenant_id: true,
        creator_id: true,
        title: true,
        body: true,
        target_audience_description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (announcement.deleted_at !== null) {
    throw new Error("Announcement has been deleted");
  }

  // Authorization check
  if (announcement.tenant_id !== orgAdmin.tenant_id) {
    throw new Error("Unauthorized to update this announcement");
  }

  const now = toISOStringSafe(new Date());

  // Update announcement
  const updated = await MyGlobal.prisma.enterprise_lms_announcements.update({
    where: { id: announcementId },
    data: {
      title: body.title,
      body: body.body,
      target_audience_description: body.target_audience_description ?? null,
      status: body.status,
      updated_at: now,
    },
    select: {
      id: true,
      tenant_id: true,
      creator_id: true,
      title: true,
      body: true,
      target_audience_description: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    creator_id: updated.creator_id,
    title: updated.title,
    body: updated.body,
    target_audience_description: updated.target_audience_description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
