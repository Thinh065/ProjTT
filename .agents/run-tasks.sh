#!/usr/bin/env bash
# Chạy song song các việc giao cho Antigravity CLI (agy). Mỗi việc một model, log riêng.
cd "$(dirname "$0")/.." || exit 1
AGY="/c/Users/Tran Thinh/.gemini/bin/agy.exe"
mkdir -p .agents/logs .agents/reports

run() {
  local id="$1" model="$2" brief="$3"
  local prompt
  prompt="Bạn là agent được giao việc $id trong dự án ProjTT (thư mục hiện tại). Hãy làm đúng đề bài dưới đây, tuân thủ tuyệt đối mục 'Chỉ được sửa' và 'Quy tắc chung'. Làm xong thì ghi báo cáo vào .agents/reports/$id.md rồi dừng.

$(cat "$brief")"
  echo "[$(date +%H:%M:%S)] start $id ($model)" > ".agents/logs/$id.log"
  "$AGY" --model "$model" --mode accept-edits --print "$prompt" >> ".agents/logs/$id.log" 2>&1
  echo "[$(date +%H:%M:%S)] exit $id code=$?" >> ".agents/logs/$id.log"
}

run T2 gemini-4-argon-high .agents/tasks/T2-dashboard-light.md &
# T3 đã xong ở lần chạy trước
run T4 gemini-4-argon-high .agents/tasks/T4-mascot-favicon.md &
wait
echo "all done"
