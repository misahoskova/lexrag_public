import { MainParser } from '../extraction/main_parser';
import { SbJson, MasterJson, MasterJsonMeta } from '../types/types';
import { readJson, readText, writeJson } from '../utils/file.utils';
import { LawFilenameBuilder } from '../utils/filename.builder';
import path from 'path';

export class LawProcessingPipeline {
  private filenameBuilder = new LawFilenameBuilder();

  constructor(
    private inputJsonPath: string,
    private outputDir: string,
    private inputHtmlPath?: string,
  ) {}

  run(): { outPath: string; data: MasterJson } {
    const sb: SbJson = readJson<SbJson>(this.inputJsonPath);
    const html = this.inputHtmlPath ? readText(this.inputHtmlPath) : undefined;
    const parser = new MainParser(sb, html);
    const masterJson: MasterJson = parser.parse();
    const noteCount = masterJson.nodes.filter(n => n.type === 'POZNAMKA_POD_CAROU').length;

    console.log(`Zpracováno ${noteCount} poznámek pod čarou.`);

    const fileName = this.filenameBuilder.build(masterJson.meta as MasterJsonMeta);
    const outPath = path.resolve(this.outputDir, fileName);

    writeJson(outPath, masterJson);

    return { outPath, data: masterJson };
  }
}
