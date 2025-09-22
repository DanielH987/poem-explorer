-- CreateTable
CREATE TABLE "public"."Poem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Anna Livebardon',
    "sourceUrl" TEXT,
    "year" INTEGER,
    "category" TEXT,
    "html" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Line" (
    "id" TEXT NOT NULL,
    "poemId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Token" (
    "id" TEXT NOT NULL,
    "poemId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "surface" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "feats" JSONB NOT NULL,
    "lexemeId" TEXT,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lexeme" (
    "id" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "definition" TEXT NOT NULL DEFAULT '',
    "ipa" TEXT,
    "audioUrlUS" TEXT,
    "audioUrlUK" TEXT,
    "cefr" TEXT,
    "frequency" TEXT,
    "forms" JSONB,
    "collocations" JSONB,
    "etymology" TEXT,
    "notes" TEXT,

    CONSTRAINT "Lexeme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sense" (
    "id" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "def" TEXT NOT NULL,
    "examples" JSONB NOT NULL,

    CONSTRAINT "Sense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Translation" (
    "id" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PoemTag" (
    "id" TEXT NOT NULL,
    "poemId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "PoemTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poem_slug_key" ON "public"."Poem"("slug");

-- CreateIndex
CREATE INDEX "Line_poemId_index_idx" ON "public"."Line"("poemId", "index");

-- CreateIndex
CREATE INDEX "Token_poemId_lineId_idx" ON "public"."Token"("poemId", "lineId");

-- CreateIndex
CREATE INDEX "Token_lemma_pos_idx" ON "public"."Token"("lemma", "pos");

-- CreateIndex
CREATE UNIQUE INDEX "Lexeme_lemma_pos_key" ON "public"."Lexeme"("lemma", "pos");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_lexemeId_lang_key" ON "public"."Translation"("lexemeId", "lang");

-- CreateIndex
CREATE INDEX "PoemTag_tag_idx" ON "public"."PoemTag"("tag");

-- AddForeignKey
ALTER TABLE "public"."Line" ADD CONSTRAINT "Line_poemId_fkey" FOREIGN KEY ("poemId") REFERENCES "public"."Poem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Token" ADD CONSTRAINT "Token_poemId_fkey" FOREIGN KEY ("poemId") REFERENCES "public"."Poem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Token" ADD CONSTRAINT "Token_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "public"."Line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Token" ADD CONSTRAINT "Token_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "public"."Lexeme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sense" ADD CONSTRAINT "Sense_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "public"."Lexeme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Translation" ADD CONSTRAINT "Translation_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "public"."Lexeme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoemTag" ADD CONSTRAINT "PoemTag_poemId_fkey" FOREIGN KEY ("poemId") REFERENCES "public"."Poem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
