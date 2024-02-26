import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.exportBreakpoints', () => {
		const breakpoints = vscode.debug.breakpoints;
		const breakpointsData = breakpoints.map(bp => {
			if (bp instanceof vscode.SourceBreakpoint) {
				return {
					path: bp.location.uri.fsPath,
					line: bp.location.range.start.line,
					enabled: bp.enabled,
					condition: bp.condition
				};
			}
		}).filter(Boolean);

		const filePath = path.join(vscode.workspace.rootPath || '', 'breakpoints.json');
		fs.writeFile(filePath, JSON.stringify(breakpointsData, null, 2), (err) => {
			if (err) {
				vscode.window.showErrorMessage('Error exporting breakpoints: ' + err.message);
				return;
			}
		});
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
