import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed announcement information by ID.
 *
 * This operation fetches the announcement details by the unique announcementId.
 * Access is restricted to organization administrators within the same tenant.
 * It performs tenant isolation and checks for active and non-deleted records.
 *
 * @param props - Object containing the organization admin's authentication
 *   payload and announcement ID.
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload.
 * @param props.announcementId - Unique identifier of the announcement to
 *   retrieve.
 * @returns The detailed announcement data as per IEnterpriseLmsAnnouncement
 *   interface.
 * @throws {Error} Throws if the organization admin is not found, inactive, or
 *   deleted.
 * @throws {Error} Throws if the announcement is not found, deleted, or access
 *   is denied due to tenant mismatch.
 */
export async function getenterpriseLmsOrganizationAdminAnnouncementsAnnouncementId(props: {
  organizationAdmin: OrganizationadminPayload;
  announcementId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAnnouncement> {
  const { organizationAdmin, announcementId } = props;

  const orgAdminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
      select: { id: true, tenant_id: true, status: true, deleted_at: true },
    });

  if (
    !orgAdminRecord ||
    orgAdminRecord.deleted_at !== null ||
    orgAdminRecord.status !== "active"
  ) {
    throw new Error("Organization Admin not found or inactive");
  }

  const announcement =
    await MyGlobal.prisma.enterprise_lms_announcements.findUnique({
      where: { id: announcementId },
    });

  if (
    !announcement ||
    announcement.deleted_at !== null ||
    announcement.tenant_id !== orgAdminRecord.tenant_id
  ) {
    throw new Error("Announcement not found or access denied");
  }

  return {
    id: announcement.id,
    tenant_id: announcement.tenant_id,
    creator_id: announcement.creator_id,
    title: announcement.title,
    body: announcement.body,
    target_audience_description:
      announcement.target_audience_description ?? null,
    status: announcement.status,
    created_at: toISOStringSafe(announcement.created_at),
    updated_at: toISOStringSafe(announcement.updated_at),
    deleted_at: announcement.deleted_at
      ? toISOStringSafe(announcement.deleted_at)
      : null,
  };
}
