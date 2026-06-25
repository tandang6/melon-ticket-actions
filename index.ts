import * as core from "@actions/core";
import { IncomingWebhook } from "@slack/webhook";
import axios from "axios";
import * as qs from "querystring";

(async () => {
  const [productId, scheduleId, seatId, webhookUrl] = [
    "product-id",
    "schedule-id",
    "seat-id",
    "slack-incoming-webhook-url",
  ].map((name) => {
    const value = core.getInput(name);
    if (!value) {
      throw new Error(`melon-ticket-actions: Please set ${name} input parameter`);
    }
    return value;
  });

  const message = core.getInput("message") ?? "티켓사세요";
  const webhook = new IncomingWebhook(webhookUrl);

  const res = await axios({
    method: "POST",
    url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
    params: { v: "1" },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": "https://ticket.melon.com/",
      "Origin": "https://ticket.melon.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    },
    data: qs.stringify({
      prodId: productId,
      scheduleNo: scheduleId,
      seatId,
      volume: 1,
      selectedGradeVolume: 1,
    }),
    validateStatus: () => true,
    responseType: "text",
  });

  console.log("HTTP Status:", res.status);

  if (res.status >= 500) {
    console.log("멜론 서버 일시 오류. 다음 실행 때 재시도합니다.");
    return;
  }

  let data: any;
  try {
    data = JSON.parse(res.data);
  } catch (e) {
    console.log("JSON 파싱 실패:", String(res.data).substring(0, 200));
    return;
  }

  console.log("Got response:", data);

  if (data.chkResult) {
    const link = `http://ticket.melon.com/performance/index.htm?${qs.stringify({ prodId: productId })}`;
    await webhook.send(`${message} ${link}`);
    console.log("슬랙 알림 전송 완료!");
  } else {
    console.log("취소표 없음. chkResult:", data.chkResult);
  }
})().catch((e) => {
  console.error(e.stack);
  core.setFailed(e.message);
});
