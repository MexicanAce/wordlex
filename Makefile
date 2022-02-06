.PHONY: start
start:
	tmux \
	new-session -s wordlex 'cd www && npx http-server -p 8088' \; \
	split-window 'cd www-admin && npx http-server -p 8089' \; \
	split-window 'node main.js' \; \
	detach-client;

.PHONY: stop
stop:
	tmux kill-session -t wordlex
