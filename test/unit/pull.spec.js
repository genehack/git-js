const {restore, newSimpleGit, newSimpleGitP, theCommandRun, closeWithSuccess} = require('./include/setup');
const {parsePull, PullSummary} = require('../../src/lib/responses/PullSummary');

describe('pull', () => {
   let git, callback = jest.fn();

   beforeEach(() => git = newSimpleGit());
   afterEach(() => restore());

   describe('parsing', () => {
      it('files added or deleted but not modified', async () => {
         const actual = parsePull(`

remote: Counting objects: 3, done.
remote: Total 3 (delta 1), reused 3 (delta 1), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:steveukx/git-js
   1a4d751..83ace81  foo        -> origin/foo
Updating 1a4d751..83ace81
Fast-forward
 something | 4 ++++
 temp      | 0
 2 files changed, 4 insertions(+)
 create mode 100644 something
 delete mode 100644 temp

      `);

         expect(actual).toEqual(expect.objectContaining({
            files: ['something', 'temp'],
            created: ['something'],
            deleted: ['temp'],
         }));
      });

      it('insertion only change set', async () => {
         const actual = parsePull(`From https://github.com/steveukx/git-js
 * branch            foo        -> FETCH_HEAD
Updating 1c57fa9..5b75063
Fast-forward
 src/responses/PullSummary.js | 2 ++
 1 file changed, 2 insertions(+)
`);

         expect(actual).toEqual(expect.objectContaining({
            summary: {
               changes: 1,
               insertions: 2,
               deletions: 0,
            },
            insertions: {
               'src/responses/PullSummary.js': 2,
            }
         }));
      });

      it('file names with special characters and spaces', async () => {
         const actual = parsePull(`
From git.kellpro.net:apps/templates
* branch            release/0.33.0 -> FETCH_HEAD
Updating 1c6e99e..2a5dc63
Fast-forward
 accounting core.kjs        |  61 ++++++++++++++++++++++
 kpo.kjs                    |  93 +++++++++++++++++++++++++++++++++
 time_tra$.kjs              | 342 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 3 files changed, 154 insertions(+), 352 deletions(-)
 create mode 100644 kis.call_stats_report.kjs
`);
         expect(actual).toEqual(expect.objectContaining({
            files: [
               'accounting core.kjs',
               'kpo.kjs',
               'time_tra$.kjs',
               'kis.call_stats_report.kjs',
            ],
            summary: {
               changes: 3,
               insertions: 154,
               deletions: 352,
            }
         }));
      });
   });

   describe('usage', () => {
      it('pulls with options', async () => {
         const pull = git.pull(undefined, undefined, {'--rebase': null});
         await closeWithSuccess(mockStdOut());
         expect(await pull).toEqual(expect.objectContaining({
            files: ['file_0.txt', 'file_1.txt'],
         }))
         expect(theCommandRun()).toEqual(['pull', '--rebase']);
      });

      it('pulls with options without branch detail', async () => {
         const pull = git.pull({'--rebase': null});
         await closeWithSuccess(mockStdOut());
         expect(await pull).toEqual(expect.objectContaining({
            files: ['file_0.txt', 'file_1.txt'],
         }))
         expect(theCommandRun()).toEqual(['pull', '--rebase']);
      });

      it('pulls with rebase options with value', async () => {
         const pull = git.pull('origin', 'master', {'--rebase': 'true'});
         await closeWithSuccess(mockStdOut(1, 5, 10));
         expect(await pull).toEqual(expect.objectContaining(({
            summary: {
               changes: 1,
               insertions: 5,
               deletions: 10,
            }
         })))
         expect(theCommandRun()).toEqual(['pull', 'origin', 'master', '--rebase=true']);
      });

      describe('simple-git/promise', () => {
         beforeEach(() => git = newSimpleGitP());

         it('returns a PullResult', async () => {
            const pull = git.pull('origin', 'main');
            await closeWithSuccess(mockStdOut(4, 5, 6));
            expect(await pull).toEqual(expect.objectContaining({
               summary: {
                  changes: 4,
                  insertions: 5,
                  deletions: 6,
               }
            }));
         })
      });

      describe('callback', () => {
         it('uses provided callback', async () => {
            const pull = git.pull(callback);
            await closeWithSuccess(mockStdOut());
            await pull;
            expect(theCommandRun()).toEqual(['pull']);
            expect(callback).toHaveBeenCalledWith(null, expect.any(PullSummary))
         });

         it('uses provided callback when there is an options array', async () => {
            const pull = git.pull(['--rebase'], callback);
            await closeWithSuccess(mockStdOut());
            await pull;
            expect(theCommandRun()).toEqual(['pull', '--rebase']);
            expect(callback).toHaveBeenCalledWith(null, expect.any(PullSummary))
         });

         it('uses provided callback when there is an options object', async () => {
            const pull = git.pull({'--rebase': null}, callback);
            await closeWithSuccess(mockStdOut());
            await pull;
            expect(theCommandRun()).toEqual(['pull', '--rebase']);
            expect(callback).toHaveBeenCalledWith(null, expect.any(PullSummary))
         });

         it('uses provided callback when there is an options array and branch detail', async () => {
            const pull = git.pull('origin', 'main', ['--rebase'], callback);
            await closeWithSuccess(mockStdOut());
            await pull;
            expect(theCommandRun()).toEqual(['pull', 'origin', 'main', '--rebase']);
            expect(callback).toHaveBeenCalledWith(null, expect.any(PullSummary))
         });

         it('uses provided callback when there is an options object and branch detail', async () => {
            const pull = git.pull('origin', 'main', {'--rebase': null}, callback);
            await closeWithSuccess(mockStdOut());
            await pull;
            expect(theCommandRun()).toEqual(['pull', 'origin', 'main', '--rebase']);
            expect(callback).toHaveBeenCalledWith(null, expect.any(PullSummary))
         });
      });

   });

   function mockStdOut (changes = 2, insertions = 6, deletions = 4) {
      const changeLine = (_, index) => String(` file_${ index }.txt`).padEnd(30, ' ') + '| 1 +';
      return `
From git.kellpro.net:apps/templates
* branch            release/0.33.0 -> FETCH_HEAD
Updating 1c6e99e..2a5dc63
Fast-forward
${ Array.from({length: changes}, changeLine).join('\n') }
 ${ changes } files changed, ${ insertions } insertions(+), ${ deletions } deletions(-)
`
   }

   function mockStdOutCreatedLine (fileName = 'created-file.txt', mode = '100644') {
      return ` create mode ${ mode } ${ fileName }\n`;
   }

})
