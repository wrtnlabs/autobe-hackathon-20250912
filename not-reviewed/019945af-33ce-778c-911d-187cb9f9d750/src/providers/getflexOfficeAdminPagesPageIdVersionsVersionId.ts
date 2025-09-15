import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageVersion";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information for a UI page version.
 *
 * Retrieves the full details of the specified page version record from the
 * database. This includes the serialized JSON snapshot data representing the
 * page's layout and configuration, version number, and timestamps.
 *
 * Requires an admin user (authorization handled externally) and path parameters
 * for pageId and versionId.
 *
 * @param props - Object containing authorization and path parameters.
 * @param props.admin - The authenticated admin user payload.
 * @param props.pageId - UUID identifying the parent UI page.
 * @param props.versionId - UUID identifying the specific page version.
 * @returns The detailed page version data conforming to IFlexOfficePageVersion.
 * @throws {Error} Throws if the version record is not found.
 */
export async function getflexOfficeAdminPagesPageIdVersionsVersionId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageVersion> {
  const { admin, pageId, versionId } = props;

  const found =
    await MyGlobal.prisma.flex_office_page_versions.findFirstOrThrow({
      where: {
        id: versionId,
        flex_office_page_id: pageId,
      },
      select: {
        id: true,
        flex_office_page_id: true,
        version_number: true,
        page_data: true,
        created_at: true,
      },
    });

  return {
    id: found.id,
    flex_office_page_id: found.flex_office_page_id,
    version_number: found.version_number,
    page_data: found.page_data,
    created_at: toISOStringSafe(found.created_at),
  };
}
