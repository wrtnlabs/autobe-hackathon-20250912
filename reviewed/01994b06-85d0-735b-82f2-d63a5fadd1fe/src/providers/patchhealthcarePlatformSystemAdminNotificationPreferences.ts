import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import { IPageIHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotificationPreference";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * 검색 및 필터링된 알림 환경설정 목록 조회 (관리자)
 *
 * 이 함수는 시스템 관리자 권한으로 health_platform_notification_preferences 테이블에서 도착 채널, 알림
 * 타입, 활성화 상태, DnD(방해금지) 설정, 승급 정책 등 다양한 필터링 및 페이징 옵션을 활용하여 알림 환경설정 내역을 목록
 * 형태(페이지네이션 포함)로 반환합니다.
 *
 * 인증: 시스템 관리자 (SystemadminPayload)
 *
 * @param props - 요청 데이터
 * @param props.systemAdmin - 시스템 관리자 인증 페이로드
 * @param props.body - 검색/필터/정렬/페이지네이션 조건 객체
 *   (IHealthcarePlatformNotificationPreference.IRequest)
 * @returns IPageIHealthcarePlatformNotificationPreference
 */
export async function patchhealthcarePlatformSystemAdminNotificationPreferences(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformNotificationPreference.IRequest;
}): Promise<IPageIHealthcarePlatformNotificationPreference> {
  const { systemAdmin, body } = props;

  // 페이지네이션 처리
  const rawPage = body.page ?? 1;
  const rawPageSize = body.pageSize ?? 20;
  const page = Number(rawPage);
  const pageSize = Number(rawPageSize);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // where 조건 구성 (DTO null/undefined 타입 규칙 엄격하게 적용)
  const where = {
    deleted_at: null,
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.notification_channel !== undefined &&
      body.notification_channel !== null && {
        notification_channel: body.notification_channel,
      }),
    ...(body.notification_type !== undefined &&
      body.notification_type !== null && {
        notification_type: body.notification_type,
      }),
    ...(body.enabled !== undefined &&
      body.enabled !== null && { enabled: body.enabled }),
  };

  // 정렬 필드 해석 (예: 'created_at desc', 'notification_type asc')
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const tokens = body.sort.trim().split(/\s+/);
    const field = tokens[0];
    const direction = (tokens[1] ?? "").toLowerCase();
    const allowedFields = [
      "created_at",
      "notification_type",
      "notification_channel",
      "enabled",
      "updated_at",
    ];
    if (allowedFields.includes(field)) {
      orderBy = {
        [field]: direction === "asc" ? "asc" : "desc",
      };
    }
  }

  // DB 질의 (병렬)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notification_preferences.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_notification_preferences.count({
      where,
    }),
  ]);

  // DTO 변환
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    organization_id: row.organization_id ?? undefined,
    notification_channel: row.notification_channel,
    notification_type: row.notification_type,
    enabled: row.enabled,
    mute_start:
      row.mute_start === null || row.mute_start === undefined
        ? undefined
        : toISOStringSafe(row.mute_start),
    mute_end:
      row.mute_end === null || row.mute_end === undefined
        ? undefined
        : toISOStringSafe(row.mute_end),
    escalation_policy:
      row.escalation_policy === null || row.escalation_policy === undefined
        ? undefined
        : row.escalation_policy,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null || row.deleted_at === undefined
        ? undefined
        : toISOStringSafe(row.deleted_at),
  }));

  // 반환: IPageIHealthcarePlatformNotificationPreference
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
