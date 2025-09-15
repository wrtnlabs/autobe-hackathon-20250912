import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Register a new patient user profile in healthcare_platform_patients.
 *
 * This function provisions a new patient account by creating a record in the
 * healthcare_platform_patients table. Registration requires unique email, full
 * legal name, and date of birth. The operation checks for existing email to
 * enforce uniqueness and sets compliant timestamps for auditability and
 * regulatory tracking. Phone is optional. Returns the created patient user
 * profile object. Throws on duplicate email or database constraint violations.
 *
 * Authorization: Requires valid PatientPayload (authenticated patient, either
 * onboarding themselves or registering another user as allowed by policy).
 *
 * @param props - Properties for the operation
 * @param props.patient - The authenticated patient context (role enforcement)
 * @param props.body - Patient demographic data for creation (email, full_name,
 *   date_of_birth, phone)
 * @returns Created patient user profile record matching
 *   IHealthcarePlatformPatient
 * @throws {Error} If a patient already exists with the requested email
 */
export async function posthealthcarePlatformPatientPatients(props: {
  patient: PatientPayload;
  body: IHealthcarePlatformPatient.ICreate;
}): Promise<IHealthcarePlatformPatient> {
  const { body } = props;

  // Check for pre-existing patient with the provided email
  const existing =
    await MyGlobal.prisma.healthcare_platform_patients.findUnique({
      where: { email: body.email },
    });
  if (existing !== null) {
    throw new Error("Patient already exists with this email");
  }

  // Generate UUID and capture timestamps
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Insert the new patient record
  const created = await MyGlobal.prisma.healthcare_platform_patients.create({
    data: {
      id,
      email: body.email,
      full_name: body.full_name,
      date_of_birth: body.date_of_birth,
      phone: body.phone ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Assemble API return object per IHealthcarePlatformPatient contract
  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    date_of_birth: toISOStringSafe(created.date_of_birth),
    phone: created.phone ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
