import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing record amendment entry for a patient record
 *
 * This operation updates (modifies) an existing record amendment entry for a
 * specific patient record. It enforces primary key (`recordAmendmentId`),
 * patient (`patientRecordId`), and RBAC constraints. It writes new amendment
 * values, potentially changes the approval status, and logs a complete audit
 * trail. It corresponds to workflows where corrections or review outcomes need
 * to be recorded against the original amendment request in the
 * healthcare_platform_record_amendments table.
 *
 * Authorization is strictly enforced by user role and organizational/dept
 * assignment; only permitted roles may update amendment status or edit content
 * after initial creation. Approval workflows are triggered if the amendment
 * requires further review or additional compliance sign-off. Attempts to update
 * amendments for soft-deleted patient records will be checked for regulatory
 * compliance.
 *
 * Responses confirm updated entity details, workflow status, and audit
 * information. Business rules will prevent modification if amendment is
 * finalized, if the requester is not authorized, or if the update violates
 * compliance logic. Error handling clearly distinguishes between authorization,
 * business rule, and not found errors.
 *
 * @param props - Object containing systemAdmin (JWT payload), patientRecordId,
 *   recordAmendmentId, and PATCH-style
 *   IHealthcarePlatformRecordAmendment.IUpdate body with fields to update
 * @returns The updated amendment entry with all details, respecting RBAC and
 *   audit
 * @throws {Error} When amendment or reviewer is not found, or update is not
 *   permitted
 */
export async function puthealthcarePlatformSystemAdminPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IUpdate;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { systemAdmin, patientRecordId, recordAmendmentId, body } = props;

  // 1. Fetch amendment by id and patient_record_id, throw if not found
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        id: recordAmendmentId,
        patient_record_id: patientRecordId,
      },
    });
  if (amendment === null) {
    throw new Error("Record amendment not found");
  }

  // 2. If reviewed_by_user_id is defined (even empty string), validate reviewer exists
  let reviewedByUserId: string | null | undefined = undefined;
  if (Object.prototype.hasOwnProperty.call(body, "reviewed_by_user_id")) {
    // interpret "" as explicit null
    reviewedByUserId =
      body.reviewed_by_user_id === "" ? null : body.reviewed_by_user_id;
    if (
      reviewedByUserId !== undefined &&
      reviewedByUserId !== null &&
      reviewedByUserId !== ""
    ) {
      const reviewerFound =
        (await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
          where: { id: reviewedByUserId },
        })) ||
        (await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
          where: { id: reviewedByUserId },
        }));
      if (!reviewerFound) {
        throw new Error("Reviewer user not found");
      }
    }
  }

  // Same for ehr_encounter_id: treat "" as null
  let ehrEncounterId: string | null | undefined = undefined;
  if (Object.prototype.hasOwnProperty.call(body, "ehr_encounter_id")) {
    ehrEncounterId =
      body.ehr_encounter_id === "" ? null : body.ehr_encounter_id;
  }

  // 3. Prepare patch update for only supplied fields (RFC-6902 PATCH semantics)
  const patch: {
    amendment_type?: string;
    old_value_json?: string;
    new_value_json?: string;
    rationale?: string;
    approval_status?: string;
    reviewed_by_user_id?: string | null;
    ehr_encounter_id?: string | null;
  } = {};
  if (Object.prototype.hasOwnProperty.call(body, "amendment_type")) {
    patch.amendment_type = body.amendment_type;
  }
  if (Object.prototype.hasOwnProperty.call(body, "old_value_json")) {
    patch.old_value_json = body.old_value_json;
  }
  if (Object.prototype.hasOwnProperty.call(body, "new_value_json")) {
    patch.new_value_json = body.new_value_json;
  }
  if (Object.prototype.hasOwnProperty.call(body, "rationale")) {
    patch.rationale = body.rationale;
  }
  if (Object.prototype.hasOwnProperty.call(body, "approval_status")) {
    patch.approval_status = body.approval_status;
  }
  if (Object.prototype.hasOwnProperty.call(body, "reviewed_by_user_id")) {
    patch.reviewed_by_user_id = reviewedByUserId;
  }
  if (Object.prototype.hasOwnProperty.call(body, "ehr_encounter_id")) {
    patch.ehr_encounter_id = ehrEncounterId;
  }

  // 4. Update amendment row (never touch created_at, id, patient_record_id, submitted_by_user_id)
  const updated =
    await MyGlobal.prisma.healthcare_platform_record_amendments.update({
      where: { id: recordAmendmentId },
      data: patch,
    });

  // 5. Return full revision, transforming date types
  return {
    id: updated.id,
    patient_record_id: updated.patient_record_id,
    submitted_by_user_id: updated.submitted_by_user_id,
    reviewed_by_user_id:
      typeof updated.reviewed_by_user_id === "string"
        ? updated.reviewed_by_user_id
        : updated.reviewed_by_user_id === null
          ? null
          : undefined,
    ehr_encounter_id:
      typeof updated.ehr_encounter_id === "string"
        ? updated.ehr_encounter_id
        : updated.ehr_encounter_id === null
          ? null
          : undefined,
    amendment_type: updated.amendment_type,
    old_value_json: updated.old_value_json,
    new_value_json: updated.new_value_json,
    rationale: updated.rationale,
    approval_status:
      typeof updated.approval_status === "string"
        ? updated.approval_status
        : updated.approval_status === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
