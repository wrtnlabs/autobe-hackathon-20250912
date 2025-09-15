import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new receptionist account in healthcare_platform_receptionists.
 *
 * This endpoint creates a new receptionist user account within the
 * healthcarePlatform system. Receptionist roles are granted to non-clinical
 * desk staff responsible for scheduling, check-in/out, and front-desk patient
 * workflows.
 *
 * Only organization administrators may create receptionists. Enforcement of
 * email uniqueness applies; creation will fail if an active receptionist with
 * the given email already exists. On success, a new immutable record is
 * inserted, timestamps are set to current time, and business information is
 * returned in compliance with organizational policies and audit requirements.
 *
 * @param props - Object containing the organization administrator payload and
 *   receptionist creation information
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing this operation
 * @param props.body - The receptionist creation payload including unique email,
 *   full name, and optional phone
 * @returns The newly created receptionist entity (including system-assigned ID
 *   and timestamps)
 * @throws {Error} If a receptionist account with the given email already exists
 *   (and is not soft-deleted)
 * @throws {Error} If the input data does not meet unique field requirements or
 *   organizational constraints
 */
export async function posthealthcarePlatformOrganizationAdminReceptionists(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformReceptionist.ICreate;
}): Promise<IHealthcarePlatformReceptionist> {
  const { organizationAdmin, body } = props;

  // Step 1: Enforce unique receptionist email (limit to active records)
  const conflict =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });
  if (conflict !== null) {
    throw new Error(
      "Receptionist with this email already exists and is active",
    );
  }

  // Step 2: Create new receptionist record
  const now = toISOStringSafe(new Date());
  const result = await MyGlobal.prisma.healthcare_platform_receptionists.create(
    {
      data: {
        id: v4() /* as string & tags.Format<'uuid'> - implicitly typed by Prisma schema */,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Step 3: Map DB result to strict API DTO
  return {
    id: result.id,
    email: result.email,
    full_name: result.full_name,
    phone: result.phone ?? null,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      result.deleted_at !== undefined && result.deleted_at !== null
        ? toISOStringSafe(result.deleted_at)
        : null,
  };
}
