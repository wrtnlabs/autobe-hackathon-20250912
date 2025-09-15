import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get the full details of a specific coding test instance by ID.
 *
 * This endpoint allows an authenticated system administrator to retrieve all
 * details about a specific coding test assignment in the recruitment system,
 * including its scheduling, provider, status, associated applicant, HR
 * recruiter, application, delivery and access metadata.
 *
 * System administrators can access any coding test instance for audit,
 * compliance, troubleshooting, and business oversight across all job
 * applications. The result includes all fields of the coding test, mapped to
 * IAtsRecruitmentCodingTest, including soft delete awareness.
 *
 * @param props - Request parameters including authentication and coding test ID
 * @param props.systemAdmin - The authenticated SystemadminPayload
 *   (authorization is enforced by controller)
 * @param props.codingTestId - The unique UUID of the coding test instance to
 *   retrieve
 * @returns The complete coding test instance fields for audit and business
 *   context
 * @throws {Error} If the coding test does not exist or is soft-deleted (404)
 */
export async function getatsRecruitmentSystemAdminCodingTestsCodingTestId(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTest> {
  const { codingTestId } = props;

  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        deleted_at: null,
      },
    });
  if (!codingTest) throw new Error("Coding test not found");

  return {
    id: codingTest.id,
    ats_recruitment_application_id: codingTest.ats_recruitment_application_id,
    ats_recruitment_applicant_id: codingTest.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id: codingTest.ats_recruitment_hrrecruiter_id,
    test_provider: codingTest.test_provider,
    test_external_id: codingTest.test_external_id ?? undefined,
    test_url: codingTest.test_url ?? undefined,
    scheduled_at: toISOStringSafe(codingTest.scheduled_at),
    delivered_at: codingTest.delivered_at
      ? toISOStringSafe(codingTest.delivered_at)
      : undefined,
    status: codingTest.status,
    expiration_at: codingTest.expiration_at
      ? toISOStringSafe(codingTest.expiration_at)
      : undefined,
    callback_received_at: codingTest.callback_received_at
      ? toISOStringSafe(codingTest.callback_received_at)
      : undefined,
    closed_at: codingTest.closed_at
      ? toISOStringSafe(codingTest.closed_at)
      : undefined,
    created_at: toISOStringSafe(codingTest.created_at),
    updated_at: toISOStringSafe(codingTest.updated_at),
    deleted_at: codingTest.deleted_at
      ? toISOStringSafe(codingTest.deleted_at)
      : undefined,
  };
}
