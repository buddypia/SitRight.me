export type LicenseCategory = 'core' | 'framework' | 'assets';

export interface LicenseEntry {
  id: string;
  name: string;
  version?: string;
  license: 'MIT' | 'Apache-2.0' | 'CC0-1.0';
  copyright: string;
  url?: string;
  description: string;
  category: LicenseCategory;
}

export const LICENSE_CATEGORIES: readonly LicenseCategory[] = [
  'core',
  'framework',
  'assets',
] as const;

export const THIRD_PARTY_PACKAGES: LicenseEntry[] = [
  {
    id: 'sitright',
    name: 'SitRight',
    version: '0.1.0',
    license: 'MIT',
    copyright: 'Copyright (c) 2025 buddypia',
    url: 'https://github.com/buddypia/SitRight.me',
    description: 'Application source code',
    category: 'core',
  },
  {
    id: 'mediapipe',
    name: '@mediapipe/tasks-vision',
    version: '0.10.35',
    license: 'Apache-2.0',
    copyright: 'Copyright Google LLC',
    url: 'https://github.com/google-ai-edge/mediapipe',
    description:
      'WebAssembly runtime (public/mediapipe/wasm/*) and AI models (public/mediapipe/models/*). Distributed unmodified.',
    category: 'core',
  },
  {
    id: 'three',
    name: 'three',
    version: '^0.186.1',
    license: 'MIT',
    copyright: 'Copyright © 2010-2026 three.js authors',
    url: 'https://threejs.org/',
    description: '3D WebGL rendering engine for skeleton and avatar display',
    category: 'core',
  },
  {
    id: 'react',
    name: 'react & react-dom',
    version: '^19.3.0',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    url: 'https://react.dev/',
    description: 'User interface components and virtual DOM runtime',
    category: 'framework',
  },
  {
    id: 'next',
    name: 'next',
    version: '^16.4.0',
    license: 'MIT',
    copyright: 'Copyright (c) 2025 Vercel, Inc.',
    url: 'https://nextjs.org/',
    description: 'Static web application build and runtime framework',
    category: 'framework',
  },
  {
    id: 'zustand',
    name: 'zustand',
    version: '^5.0.15',
    license: 'MIT',
    copyright: 'Copyright (c) 2019 Paul Henschel',
    url: 'https://github.com/pmndrs/zustand',
    description: 'Lightweight client-side state management library',
    category: 'framework',
  },
  {
    id: 'makehuman-assets',
    name: 'MakeHuman MPFB 2 Assets',
    license: 'CC0-1.0',
    copyright: 'MakeHuman Community (released under CC0 1.0 Universal)',
    url: 'https://static.makehumancommunity.org/',
    description:
      '3D realistic avatar models (public/avatars/{woman,man,senior,womanSporty}.glb). Body meshes, textures, hair, and clothing from MakeHuman system assets and community packs.',
    category: 'assets',
  },
  {
    id: 'original-assets',
    name: 'Original 3D Characters',
    license: 'MIT',
    copyright: 'Copyright (c) 2025 buddypia',
    description:
      'Custom stylized chibi models (public/avatars/{hamu,dino}.glb) created for SitRight.',
    category: 'assets',
  },
];

export const LICENSE_TEXTS: Record<LicenseEntry['license'], string> = {
  MIT: `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,

  'Apache-2.0': `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.
"License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.
"Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License.
"Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity.
"You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License.
"Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.
"Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.
"Work" shall mean the work of authorship, whether in Source or Object form, made available under the License.
"Derivative Works" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work.

2. Grant of Copyright License.
Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.

3. Grant of Patent License.
Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work.

4. Redistribution.
You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:
(a) You must give any other recipients of the Work or Derivative Works a copy of this License; and
(b) You must cause any modified files to carry prominent notices stating that You changed the files; and
(c) You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work; and
(d) If the Work includes a "NOTICE" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file.

5. Disclaimer of Warranty.
Unless required by applicable law or agreed to in writing, Licensor provides the Work on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE.`,

  'CC0-1.0': `Creative Commons Legal Code
CC0 1.0 Universal (CC0 1.0) Public Domain Dedication

The person who associated a work with this deed has dedicated the work to the public domain by waiving all of his or her rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law.

You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.

In no way are the patent or trademark rights of any person affected by CC0, nor are the rights that other persons may have in the work or in how the work is used, such as publicity or privacy rights.
Unless expressly stated otherwise, the person who associated a work with this deed makes no warranties about the work, and disclaims liability for all uses of the work, to the fullest extent permitted by applicable law.`,
};

export function getFullLicenseNotice(pkg: LicenseEntry): string {
  const base = LICENSE_TEXTS[pkg.license];
  return `${pkg.name}${pkg.version ? ` (${pkg.version})` : ''}
${pkg.copyright}
${pkg.url ? `URL: ${pkg.url}\n` : ''}
${base}`;
}
