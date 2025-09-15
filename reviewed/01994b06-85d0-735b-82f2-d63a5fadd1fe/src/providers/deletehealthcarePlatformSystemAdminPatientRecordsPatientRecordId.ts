import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently erases (hard deletes) a patient record from the system.
 *
 * This operation deletes the row from healthcare_platform_patient_records by
 * its unique ID, permanently removing the patient record from the database.
 * Unlike routine deletions (which set deleted_at), this function performs a
 * physical removal, suitable only under exceptional, tightly controlled
 * compliance or administrative conditions.
 *
 * Only system administrators may invoke this function, and they must supply a
 * valid SystemadminPayload. The operation validates the existence of the record
 * before deletion, ensuring that attempts to hard delete a non-existent entry
 * raise a clear error.
 *
 * No Date type is used; all types are strongly branded with typia tags for full
 * safety. No type assertion or as is required at any point. All logic is
 * functional and immutable.
 *
 * @param props - SystemAdmin: authenticated system admin payload (authorization
 *   required) patientRecordId: unique id for the patient record (string &
 *   tags.Format<'uuid'>)
 * @returns Void
 * @throws {Error} If no patient record exists with the specified ID
 */
export async function deletehealthcarePlatformSystemAdminPatientRecordsPatientRecordId(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { patientRecordId } = props;

  // 1. Validate that the record exists (or throw)
  await MyGlobal.prisma.healthcare_platform_patient_records.findUniqueOrThrow({
    where: { id: patientRecordId },
  });

  // 2. Hard delete (permanently remove from DB)
  await MyGlobal.prisma.healthcare_platform_patient_records.delete({
    where: { id: patientRecordId },
  });
}
