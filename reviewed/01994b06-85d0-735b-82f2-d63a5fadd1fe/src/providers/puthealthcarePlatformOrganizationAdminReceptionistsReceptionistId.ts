import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing receptionist account by receptionistId in
 * healthcare_platform_receptionists.
 *
 * This endpoint allows an authorized organization administrator to update
 * profile details (full_name, phone) for a receptionist account, identified by
 * receptionistId. Only active (not soft-deleted) receptionist accounts are
 * eligible for update. Partial update is supported: omitted fields remain
 * unchanged, and phone can be set to null to clear it.
 *
 * The update automatically refreshes updated_at. Email cannot be changed using
 * this endpoint. Attempts to update a non-existent or deleted receptionist, or
 * to supply no updatable fields, result in an error. Updated account info is
 * returned in type-safe format suitable for downstream use.
 *
 * @param props - The request parameters and update body
 * @param props.organizationAdmin - Authenticated organizationadmin payload
 * @param props.receptionistId - The unique id of the receptionist to update
 * @param props.body - The fields to update (full_name, phone)
 * @returns The updated receptionist info, with all timestamps as ISO strings
 * @throws {Error} If not found, already deleted, or empty/invalid update body
 */
export async function puthealthcarePlatformOrganizationAdminReceptionistsReceptionistId(props: {
  organizationAdmin: OrganizationadminPayload;
  receptionistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformReceptionist.IUpdate;
}): Promise<IHealthcarePlatformReceptionist> {
  const { organizationAdmin, receptionistId, body } = props;

  // Step 1: Locate active receptionist
  const receptionist =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: {
        id: receptionistId,
        deleted_at: null,
      },
    });
  if (!receptionist) {
    throw new Error("Receptionist not found or already deleted");
  }

  // Step 2: Determine updatable fields
  const updateFields: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof body.full_name === "string") {
    updateFields.full_name = body.full_name;
  }
  if (body.phone !== undefined) {
    updateFields.phone = body.phone;
  }

  // Check: At least one updatable field must be present
  const hasUpdatable = Object.keys(updateFields).length > 1; // updated_at is always present
  if (!hasUpdatable) {
    throw new Error(
      "No updatable fields provided. At least one of full_name or phone is required.",
    );
  }

  // Step 3: Perform update
  const updated =
    await MyGlobal.prisma.healthcare_platform_receptionists.update({
      where: { id: receptionistId },
      data: updateFields,
    });

  // Step 4: Return the fully type-safe response
  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    phone: updated.phone ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
