FROM denoland/deno:debian

RUN apt-get update && apt-get install -y \
    maxima \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT [ "deno" ]
CMD [ "run", "--allow-run", "jsr:@toms/mcp-maxima" ]
