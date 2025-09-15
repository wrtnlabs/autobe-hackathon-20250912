import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new technician record in healthcare_platform_technicians.
 *
 * Onboards a new technical staff member (e.g. imaging or lab technologist) by
 * submitting the required fields—unique business email, full legal name,
 * license number, and optional specialty/phone. Validates uniqueness of email
 * and license, inserts the record with strictly branded types and proper ISO
 * timestamps. Does not use the native Date type. Only systemAdmins may perform
 * this operation.
 *
 * @param props - Props with systemAdmin context and technician onboarding data
 * @param props.systemAdmin - Authenticated systemAdmin payload
 * @param props.body - Technician (ICreate) onboarding payload: email,
 *   full_name, license_number, specialty?, phone?
 * @returns The newly created technician as stored in the DB and adapted to API
 *   shape
 * @throws {Error} If the business email or license number already exist in the
 *   system
 */
export async function posthealthcarePlatformSystemAdminTechnicians(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformTechnician.ICreate;
}): Promise<IHealthcarePlatformTechnician> {
  const { body } = props;

  // 1. Validate unique constraints for email
  const emailExists =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: { email: body.email },
    });
  if (emailExists) {
    throw new Error("A technician with this email already exists.");
  }
  // 2. Validate unique constraints for license_number
  const licenseExists =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: { license_number: body.license_number },
    });
  if (licenseExists) {
    throw new Error("A technician with this license number already exists.");
  }

  // 3. Prepare new technician fields
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 4. Insert the technician record
  const created = await MyGlobal.prisma.healthcare_platform_technicians.create({
    data: {
      id,
      email: body.email,
      full_name: body.full_name,
      license_number: body.license_number,
      specialty: body.specialty ?? null,
      phone: body.phone ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // 5. Return the strict API DTO (convert all Date fields to string)
  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    license_number: created.license_number,
    // Use undefined if null for optional/nullable per DTO spec
    specialty: created.specialty === null ? undefined : created.specialty,
    phone: created.phone === null ? undefined : created.phone,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || typeof created.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
