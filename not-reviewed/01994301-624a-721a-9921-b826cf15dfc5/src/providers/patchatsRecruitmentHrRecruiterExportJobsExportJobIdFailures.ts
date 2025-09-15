import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportFailure";
import { IPageIAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportFailure";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * 검색 및 페이지네이션으로 특정 엑스포트 잡의 실패(ats_recruitment_export_failures)를 조회합니다.
 *
 * 이 엔드포인트는 인증된 HR리크루터가 자신이 생성한 엑스포트 잡에 대해, 실패 로그를 페이징/필터링 조회하도록 지원합니다.
 *
 * @param props - 요청 정보 객체
 * @param props.hrRecruiter - 인증된 HR리크루터 (initiator 권한)
 * @param props.exportJobId - 조회 대상 엑스포트 잡의 UUID
 * @param props.body - 필터링 및 페이지네이션 파라미터 (IAtsRecruitmentExportFailure.IRequest)
 * @returns 엑스포트 실패 로그의 페이지네이션된 목록 (IPageIAtsRecruitmentExportFailure)
 * @throws {Error} - 엑스포트 잡이 존재하지 않거나, 권한이 없을 때
 */
export async function patchatsRecruitmentHrRecruiterExportJobsExportJobIdFailures(props: {
  hrRecruiter: HrrecruiterPayload;
  exportJobId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentExportFailure.IRequest;
}): Promise<IPageIAtsRecruitmentExportFailure> {
  const { hrRecruiter, exportJobId, body } = props;

  // 1. 권한/존재 확인: 해당 ExportJob이 존재하며 initiator가 본인인지 검증
  const exportJob =
    await MyGlobal.prisma.ats_recruitment_export_jobs.findUnique({
      where: { id: exportJobId },
      select: { initiator_id: true },
    });
  if (!exportJob) throw new Error("Export job not found");
  if (exportJob.initiator_id !== hrRecruiter.id)
    throw new Error(
      "Forbidden: Only the export job initiator may view failures for this job",
    );

  // 2. 검색 조건 구축 (필수: export_job_id, 선택: failure_stage/reason, failed_at 범위)
  const where = {
    export_job_id: exportJobId,
    ...(body.failure_stage !== undefined
      ? { failure_stage: body.failure_stage }
      : {}),
    ...(body.failure_reason !== undefined
      ? { failure_reason: { contains: body.failure_reason } }
      : {}),
    ...(body.failed_at_from !== undefined || body.failed_at_to !== undefined
      ? {
          failed_at: {
            ...(body.failed_at_from !== undefined
              ? { gte: body.failed_at_from }
              : {}),
            ...(body.failed_at_to !== undefined
              ? { lte: body.failed_at_to }
              : {}),
          },
        }
      : {}),
  };

  // 3. 페이지네이션 계산 및 한계 처리 (기본값: page 1, limit 20, 최대 100)
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  // 4. 데이터 조회 및 카운트 병렬 실행
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_export_failures.findMany({
      where,
      orderBy: { failed_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_export_failures.count({ where }),
  ]);

  // 5. 반환 객체 가공 및 날짜 문자열 변환
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit) || 1,
    },
    data: rows.map((row) => ({
      id: row.id,
      export_job_id: row.export_job_id,
      failure_stage: row.failure_stage,
      failure_reason: row.failure_reason,
      failed_at: toISOStringSafe(row.failed_at),
    })),
  };
}
