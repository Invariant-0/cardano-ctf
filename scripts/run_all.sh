#!/bin/bash

# ⚠️ The script assumes it is run from the project root path!

# Loop from 0 to 10
for i in $(seq -w 0 10); do
  task_num=$(printf "%02d" $i)
  echo "Running task $task_num..."
  yarn task:$task_num
  echo "Completed task $task_num."
  echo ""
done

echo "All tasks completed."
