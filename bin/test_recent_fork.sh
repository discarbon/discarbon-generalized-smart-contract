#!/bin/bash
#
# Run "hardhat test" using a local node forked from a very recent block.
# 
# Run this script from the project's root directory.
#
# Any additonal arguments to this script are forwarded as args to "hardhat test", for example:
# bin/test_recent_fork.sh --grep WETH
#
# Requires jq
# sudo apt install jq

TEST_EXTRA_ARGS=$@

POLYGON_RPC_URL=https://polygon-rpc.com

LATEST_BLOCK_NUMBER=`curl -s $POLYGON_RPC_URL -X \
    POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    | jq  -r .result`;
FORK_BLOCK_NUMBER=$(($LATEST_BLOCK_NUMBER - 0x40))

echo -e "\nForking from block $FORK_BLOCK_NUMBER...\n"
npx hardhat node --fork $POLYGON_RPC_URL --fork-block-number $FORK_BLOCK_NUMBER > /dev/null & 
node_pid=$!
node_exit_code=$?

sleep 2

echo "Running in ci: $CI"
if [[ $CI == "true" ]]; then
    TERMINAL=/dev/null  # /dev/tty not available in github actins/docker
else
    TERMINAL=/dev/tty
fi

test_output=`npx hardhat test --network localhost $TEST_EXTRA_ARGS 2>&1 | tee $TERMINAL`
test_exit_code=$?

kill $!
kill $node_pid

if echo "$test_output" | grep -q "Uncaught error outside test suite"; then 
    echo -e "\n\nUncaught error outside test suite - problem running 'hardhat node'?"; 
    exit 1;
else 
    echo -e "\n\n'hardhat test' completed with exit code $test_exit_code"; 
    exit $test_exit_code; 
fi
