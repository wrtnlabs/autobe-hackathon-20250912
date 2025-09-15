import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new nurse staff account in the healthcare_platform_nurses table.
 *
 * Allows privileged organization administrators to register new nurse staff
 * members, enforcing business rules around unique email and license numbers.
 * All mandatory fields (email, full_name, license_number) are required;
 * optional fields (specialty, phone) are accepted if provided. Business logic
 * checks for uniqueness before creation and sets up full audit metadata. No
 * native Date type is used - all date fields are handled as ISO-8601 date-time
 * strings. Upon successful creation, returns the nurse's full profile.
 *
 * @param props - Request context and nurse creation information
 *
 *   - OrganizationAdmin: The authenticated organization admin creating the nurse
 *   - Body: The nurse's profile creation information, matching
 *       IHealthcarePlatformNurse.ICreate
 *
 * @returns The nurse profile as recorded in the system
 * @throws {Error} If email or license_number already exists in the system
 */
export async function posthealthcarePlatformOrganizationAdminNurses(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformNurse.ICreate;
}): Promise<IHealthcarePlatformNurse> {
  // Get current timestamp in ISO8601 format for creation and update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Enforce unique email and license_number (business logic before DB constraint)
  const duplicate = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: {
      OR: [
        { email: props.body.email },
        { license_number: props.body.license_number },
      ],
    },
  });
  if (duplicate !== null) {
    if (duplicate.email === props.body.email) {
      throw new Error("A nurse with this email already exists.");
    } else {
      throw new Error("A nurse with this license number already exists.");
    }
  }

  // Prepare input fields for optional types, matching schema's null vs undefined rules
  const nurseData = {
    id: v4() as string & tags.Format<"uuid">,
    email: props.body.email,
    full_name: props.body.full_name,
    license_number: props.body.license_number,
    specialty: props.body.specialty ?? undefined,
    phone: props.body.phone ?? undefined,
    created_at: now,
    updated_at: now,
  };

  const created = await MyGlobal.prisma.healthcare_platform_nurses.create({
    data: nurseData,
  });

  // Transform DB response to API type; ensure types and handle null vs undefined for optional properties
  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    license_number: created.license_number,
    specialty: created.specialty ?? undefined,
    phone: created.phone ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
