import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a single organization's detail record by ID (platform admin view).
 *
 * Fetches the detailed information for a specific healthcare organization using
 * its unique identifier. Only accessible by Systemadmin (platform
 * administrator) roles. Loads all business fields and compliance-related
 * metadata, including creation/deletion timestamps. Throws if the organization
 * is not found.
 *
 * @param props - The request properties
 * @param props.systemAdmin - Authenticated SystemadminPayload (must be valid
 *   system platform admin)
 * @param props.organizationId - UUID of the organization to retrieve
 * @returns IHealthcarePlatformOrganization – The detailed organization master
 *   record
 * @throws {Error} When the organization does not exist
 */
export async function gethealthcarePlatformSystemAdminOrganizationsOrganizationId(props: {
  systemAdmin: SystemadminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformOrganization> {
  const { organizationId } = props;

  // Fetch the organization record strictly by ID
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: { id: organizationId },
    },
  );
  if (org === null) {
    throw new Error("Organization not found");
  }

  return {
    id: org.id,
    code: org.code,
    name: org.name,
    status: org.status,
    created_at: toISOStringSafe(org.created_at),
    updated_at: toISOStringSafe(org.updated_at),
    // Properly handle deleted_at (optional and nullable)
    ...(org.deleted_at !== null && org.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(org.deleted_at) }
      : {}),
  };
}
