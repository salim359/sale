.PHONY: build-CrawlerFunction

build-CrawlerFunction:
	rm -rf "$(ARTIFACTS_DIR)"/*
	cp crawler-package.json "$(ARTIFACTS_DIR)/package.json"
	npx esbuild src/crawler/handler.ts \
		--bundle \
		--platform=node \
		--target=es2022 \
		--format=esm \
		--packages=external \
		--minify \
		--sourcemap \
		--outfile=$(ARTIFACTS_DIR)/handler.mjs
	cd "$(ARTIFACTS_DIR)" && npm install --omit=dev --no-package-lock
