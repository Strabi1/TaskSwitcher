import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	// =========================================
	// Check and create .vscode folder
	// =========================================
	let vsCodeFolder = "";

	try {
		vsCodeFolder = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.vscode');

		if(!fs.existsSync(vsCodeFolder)) {
			try { fs.mkdirSync(vsCodeFolder); }
			catch {vscode.window.showErrorMessage(".vscode floder create error!"); return; }
		}
 
	} catch { vscode.window.showErrorMessage('No workspace is open! Please open a workspace or folder!'); return; }

	const bpFile = path.join(vsCodeFolder, 'breakpoints.json');

	context.subscriptions.push(
		// =========================================
		// Export breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.exportBreakpoints', () => {
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
			
			fs.writeFile(bpFile, JSON.stringify(breakpointsData, null, 2), (err) => {
				if (err) {
					vscode.window.showErrorMessage('Error exporting breakpoints: ' + err.message);
					return;
				}
			});
		}),
		
		// =========================================
		// Import breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.importBreakpoints', async () => {
			fs.readFile(bpFile, { encoding: 'utf8' }, async (err, data) => {
				if (err) {
					vscode.window.showErrorMessage('Error importing breakpoints: ' + err.message);
					return;
				}
	
				try {
					const breakpointsData = JSON.parse(data);
					const breakpoints = breakpointsData.map((bp: any) => {
						return new vscode.SourceBreakpoint(new vscode.Location(vscode.Uri.file(bp.path), new vscode.Position(bp.line, 0)), bp.enabled);
					});
	
					vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
					vscode.debug.addBreakpoints(breakpoints);
					vscode.window.showInformationMessage('Breakpoints imported successfully.');
				} catch (error: any) {
					vscode.window.showErrorMessage(`Error parsing breakpoints JSON: ${error.message}`);
				}
			});
		})

	);
}

export function deactivate() {}
