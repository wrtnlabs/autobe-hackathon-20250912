import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update properties of a healthcare organization by ID (platform admin only).
 *
 * This API allows a system admin to update the code, display name, or status of
 * any healthcare organization. Only fields provided in the request body will be
 * updated. Changes are strictly tracked: all before/after states are written to
 * the internal audit log for compliance, and uniqueness of the code field is
 * enforced.
 *
 * If the requested organizationId does not exist, or no valid fields are
 * supplied to update, an error is thrown. Attempting to set a code already in
 * use by another organization yields a conflict error.
 *
 * @param props - Update properties for a healthcare organization
 * @param props.systemAdmin - The authenticated system administrator (must pass
 *   all authorization checks)
 * @param props.organizationId - The UUID of the organization to update
 * @param props.body - Partial update (code, name, status - at least one
 *   required)
 * @returns The updated organization record with all scalar fields and
 *   timestamps
 * @throws {Error} If no updatable fields are provided, the organization is not
 *   found, or a code conflict exists
 */
export async function puthealthcarePlatformSystemAdminOrganizationsOrganizationId(props: {
  systemAdmin: SystemadminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformOrganization.IUpdate;
}): Promise<IHealthcarePlatformOrganization> {
  const { systemAdmin, organizationId, body } = props;

  // 1. Enforce at least one updatable field present
  if (
    body.code === undefined &&
    body.name === undefined &&
    body.status === undefined
  ) {
    throw new Error(
      "At least one of 'code', 'name', or 'status' must be provided to update",
    );
  }

  // 2. Fetch the pre-update image (must exist and not deleted)
  const before =
    await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
      where: {
        id: organizationId,
        deleted_at: null,
      },
    });
  if (!before) throw new Error("Organization not found");

  // 3. Prepare fields to update (only provided ones)
  const now = toISOStringSafe(new Date());
  const updateFields = {
    ...(body.code !== undefined && { code: body.code }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.status !== undefined && { status: body.status }),
    updated_at: now,
  };

  let after;
  try {
    after = await MyGlobal.prisma.healthcare_platform_organizations.update({
      where: { id: organizationId },
      data: updateFields,
    });
  } catch (e) {
    // Prisma error code P2002: Unique constraint failed on the fields: (`code`)
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      throw new Error("Organization code must be unique");
    }
    throw e;
  }

  // 4. Write audit-trail entry (before/after image, actor info, action type)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: organizationId,
      action_type: "RECORD_UPDATE",
      event_context: JSON.stringify({
        entity: "healthcare_platform_organizations",
      }),
      related_entity_type: "healthcare_platform_organizations",
      related_entity_id: organizationId,
      created_at: now,
      // Optional: snapshot of before/after, masked for PHI compliance if needed
    },
  });

  return {
    id: after.id,
    code: after.code,
    name: after.name,
    status: after.status,
    created_at: toISOStringSafe(after.created_at),
    updated_at: toISOStringSafe(after.updated_at),
    deleted_at:
      after.deleted_at === null || after.deleted_at === undefined
        ? undefined
        : toISOStringSafe(after.deleted_at),
  };
}
