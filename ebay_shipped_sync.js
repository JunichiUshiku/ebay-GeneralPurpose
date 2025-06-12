/**
 * =============================================================================
 * eBay 在庫管理 - 発送済み同期スクリプト
 * =============================================================================
 * 
 * 【概要】
 * Google スプレッドシート上で「有在庫管理表」と「発送済みリスト」間の
 * データ同期を自動化するスクリプトです。
 * 
 * 【機能】
 * - 選択範囲のD列が「発送済」の行を「発送済みリスト」に転送
 * - 発送済でなくなった行は「発送済みリスト」から削除
 * - 数式の行番号を転送先に合わせて自動調整
 * - 重複データの防止と進捗表示
 * 
 * 【実行環境】
 * Google Apps Script（GAS）でスプレッドシート拡張機能として使用
 * 
 * 【対象シート】
 * - 「有在庫管理表」（転送元）
 * - 「発送済みリスト」（転送先）
 * 
 * 【使用方法】
 * 1. 「有在庫管理表」で対象行を選択
 * 2. bulkCopyShippedRowsFromSelection() 関数を実行
 * 
 * =============================================================================
 */

/**
 * 有在庫管理表タブの M1 セルに進捗状況を更新する関数
 */
function updateProgress(progressText) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName("有在庫管理表");
  if (sourceSheet) {
    sourceSheet.getRange("M1").setValue(progressText);
  }
}

/**
 * 数式文字列内のセル参照の行番号を、指定のオフセットだけ調整する。
 * 絶対参照（例：$K$478）は変更しません。
 */
function adjustFormula(formula, offset) {
  if (!formula || formula === "") return formula;
  if (formula.charAt(0) !== "=") return formula;
  return formula.replace(/(\$?[A-Za-z]+)(\$?)(\d+)/g, function(match, col, lock, rowNum) {
    if (lock === "$") {
      return match;
    } else {
      var newRow = parseInt(rowNum, 10) - offset;
      return col + lock + newRow;
    }
  });
}

/**
 * 複数の選択範囲に対応した転送処理
 * ・選択範囲内の各行について、D列の値（前後の空白除去後）が「発送済」なら追加対象、
 *   そうでなければ（かつB列にIDがあるなら）削除対象として処理します。
 * ・転送時は、B列は固定値として転送し、各セルは、数式があればその数式、
 *   数式がなければセルの値（文字列、数値、または Date オブジェクトの場合）のみ転送し、
 *   それ以外の場合は空セルにします。
 * ・転送対象の各行について、元の行番号との差分（オフセット）により、数式内のセル参照を調整します。
 * ・進捗は、有在庫管理表タブの M1 セルにパーセンテージで更新します。
 * ・処理完了後、発送済みリストタブの5行目以降をB列で昇順にソートします。
 */
function bulkCopyShippedRowsFromSelection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName("有在庫管理表");
  var targetSheet = ss.getSheetByName("発送済みリスト");
  if (!sourceSheet || !targetSheet) {
    SpreadsheetApp.getUi().alert("シート名が正しく設定されていません。");
    return;
  }
  
  // 複数の選択範囲を取得
  var selectionList = sourceSheet.getActiveRangeList();
  if (!selectionList) {
    SpreadsheetApp.getUi().alert("セル範囲が選択されていません。");
    return;
  }
  var ranges = selectionList.getRanges();
  
  // シート全体の最終列を取得（共通で利用）
  var lastColumn = sourceSheet.getLastColumn();
  
  // 選択範囲全体の総行数を算出
  var totalRowsInSelection = 0;
  ranges.forEach(function(range) {
    totalRowsInSelection += range.getNumRows();
  });
  
  var processedRows = 0; // 進捗カウンタ
  var addedCount = 0;
  var removedCount = 0;
  var finalRowsFormulas = [];  // 転送対象各行の数式用配列
  var finalRowsValues = [];    // 転送対象各行の値用配列（数式がないセル用）
  var addIDs = [];             // 転送対象各行のB列（ID）の値
  var addSourceRowNumbers = []; // 転送対象の各行の元の行番号（数式調整用）
  var idsToRemove = [];        // 削除対象のID
  
  // 各選択範囲ごとに処理
  ranges.forEach(function(range) {
    var startRow = range.getRow();
    var numRows = range.getNumRows();
    var rangeColumns = range.getNumColumns();
    var sourceValues, sourceFormulas;
    if (rangeColumns < lastColumn) {
      // 選択範囲がシート全体の列数に満たない場合は、対象行全体を取得
      sourceValues = sourceSheet.getRange(startRow, 1, numRows, lastColumn).getValues();
      sourceFormulas = sourceSheet.getRange(startRow, 1, numRows, lastColumn).getFormulas();
    } else {
      sourceValues = range.getValues();
      sourceFormulas = range.getFormulas();
    }
    
    for (var i = 0; i < numRows; i++) {
      processedRows++; // 全行処理済みカウント
      var progressPercent = Math.round((processedRows / totalRowsInSelection) * 100);
      updateProgress("進捗：" + progressPercent + "%");
      
      var currentRowNumber = startRow + i;
      // ユーザー非表示、またはフィルター非表示の行はスキップ
      if (sourceSheet.isRowHiddenByUser(currentRowNumber) || sourceSheet.isRowHiddenByFilter(currentRowNumber)) {
        continue;
      }
      
      var rowValues = sourceValues[i];
      var rowFormulas = sourceFormulas[i];
      // D列の値を文字列化し、前後の空白を除去して判定
      var dVal = rowValues[3] ? rowValues[3].toString().trim() : "";
      var id = rowValues[1];
      
      if (dVal === "発送済") {
        // 追加対象の場合
        var newFormulaRow = [];
        var newValueRow = [];
        for (var j = 0; j < lastColumn; j++) {
          if (j === 1) {
            // B列は固定値として転送（数式はクリアし、値をそのまま）
            newFormulaRow.push("");
            newValueRow.push(rowValues[j]);
          } else {
            if (rowFormulas[j] && rowFormulas[j] !== "") {
              newFormulaRow.push(rowFormulas[j]);
              newValueRow.push(null);
            } else {
              // 数式がない場合は、値の型をチェック
              var cellValue = rowValues[j];
              if (typeof cellValue === "string" || typeof cellValue === "number" || cellValue instanceof Date) {
                newFormulaRow.push("");
                newValueRow.push(cellValue);
              } else {
                newFormulaRow.push("");
                newValueRow.push("");
              }
            }
          }
        }
        finalRowsFormulas.push(newFormulaRow);
        finalRowsValues.push(newValueRow);
        addIDs.push(id);
        addSourceRowNumbers.push(currentRowNumber);
        addedCount++;
      } else {
        // D列が「発送済」でない場合、IDがあれば削除対象に
        if (id !== "") {
          idsToRemove.push(id);
        }
      }
    }
  });
  
  // 重複する削除対象IDを一意にする
  idsToRemove = Array.from(new Set(idsToRemove));
  
  // 削除処理：発送済みリストのB列を取得し、削除対象IDがあれば行を削除（下から上へループ）
  var targetLastRow = targetSheet.getLastRow();
  if (targetLastRow > 0) {
    var targetData = targetSheet.getRange(1, 2, targetLastRow, 1).getValues();
    for (var i = targetData.length - 1; i >= 0; i--) {
      if (idsToRemove.indexOf(targetData[i][0]) !== -1) {
        targetSheet.deleteRow(i + 1);
        removedCount++;
      }
    }
  }
  
  // 再度、発送済みリストのB列の値を取得して、既存のIDをセットにまとめる
  targetLastRow = targetSheet.getLastRow();
  var targetIDs = {};
  if (targetLastRow > 0) {
    var tData = targetSheet.getRange(1, 2, targetLastRow, 1).getValues();
    for (var i = 0; i < tData.length; i++) {
      if (tData[i][0] !== "") {
        targetIDs[tData[i][0]] = true;
      }
    }
  }
  
  // 追加対象のうち、既に存在しないものだけを転送対象とする
  var filteredFormulas = [];
  var filteredValues = [];
  var finalAddedCount = 0;
  var finalSourceRows = []; // 対応する元の行番号
  for (var i = 0; i < finalRowsFormulas.length; i++) {
    if (!targetIDs[addIDs[i]]) {
      filteredFormulas.push(finalRowsFormulas[i]);
      filteredValues.push(finalRowsValues[i]);
      finalSourceRows.push(addSourceRowNumbers[i]);
      finalAddedCount++;
    }
  }
  
  // 追加対象があれば、転送先シートに一括書き込みする前に、数式内のセル参照を調整する
  if (finalAddedCount > 0) {
    var targetStartRow = targetSheet.getLastRow() + 1;
    // 各行について、オフセット = (元の行番号 - (転送先開始行 + 行インデックス))
    for (var i = 0; i < finalAddedCount; i++) {
      var offset = finalSourceRows[i] - (targetStartRow + i);
      for (var j = 0; j < lastColumn; j++) {
        if (filteredFormulas[i][j] && filteredFormulas[i][j] !== "") {
          filteredFormulas[i][j] = adjustFormula(filteredFormulas[i][j], offset);
        }
      }
    }
    
    var targetRange = targetSheet.getRange(targetStartRow, 1, finalAddedCount, lastColumn);
    // まず、一括で数式を書き込む
    targetRange.setFormulas(filteredFormulas);
    
    // 次に、数式が設定されていないセル（空文字になっているセル）について、連続するセルごとに値を設定する
    for (var i = 0; i < finalAddedCount; i++) {
      var rowFormulas = filteredFormulas[i];
      var rowValues = filteredValues[i];
      var colStart = null;
      for (var j = 0; j < lastColumn; j++) {
        if (rowFormulas[j] === "") {
          if (colStart === null) {
            colStart = j;
          }
        } else {
          if (colStart !== null) {
            var numCols = j - colStart;
            var segment = [ rowValues.slice(colStart, j) ];
            targetSheet.getRange(targetStartRow + i, colStart + 1, 1, numCols).setValues(segment);
            colStart = null;
          }
        }
      }
      if (colStart !== null) {
        var numCols = lastColumn - colStart;
        var segment = [ rowValues.slice(colStart) ];
        targetSheet.getRange(targetStartRow + i, colStart + 1, 1, numCols).setValues(segment);
      }
    }
  }
  
  // 最終進捗更新
  updateProgress("進捗：100%");
  
  // 発送済みリストの5行目以降をB列（列番号2）で昇順にソートする
  var finalTargetLastRow = targetSheet.getLastRow();
  if (finalTargetLastRow > 4) {
    targetSheet.getRange(5, 1, finalTargetLastRow - 4, lastColumn).sort({ column: 2, ascending: true });
  }
  
  // 有在庫管理表のD列フィルターで「発送済」を非表示にする
  try {
    var filter = sourceSheet.getFilter();
    
    // 既存のフィルターがない場合は新規作成
    if (!filter) {
      var dataRange = sourceSheet.getRange(1, 1, sourceSheet.getLastRow(), sourceSheet.getLastColumn());
      filter = dataRange.createFilter();
    }
    
    // D列の全ての一意な値を取得
    var dColumnValues = sourceSheet.getRange(2, 4, sourceSheet.getLastRow() - 1, 1).getValues();
    var uniqueValues = [];
    var seenValues = {};
    
    for (var i = 0; i < dColumnValues.length; i++) {
      var value = dColumnValues[i][0] ? dColumnValues[i][0].toString().trim() : "";
      if (value !== "" && !seenValues[value]) {
        seenValues[value] = true;
        uniqueValues.push(value);
      }
    }
    
    // D列のフィルター条件を設定（「発送済」「破棄」を非表示にする）
    // より確実な方法：setHiddenValuesを使用
    var criteria = SpreadsheetApp.newFilterCriteria()
      .setHiddenValues(["発送済", "破棄"])
      .build();
    
    filter.setColumnFilterCriteria(4, criteria);
    
    // フィルターの反映を確実にするため、少し待機してから更新
    Utilities.sleep(100);
    SpreadsheetApp.flush();
    
         updateProgress("ステータスフィルター：「発送済」「破棄」を非表示に設定");
  } catch (filterError) {
    console.error("フィルター設定エラー:", filterError);
    // フィルター設定に失敗してもメイン処理は続行
  }
  
  // 結果メッセージの表示
  SpreadsheetApp.getUi().alert("合計 " + totalRowsInSelection + " 行分の処理を行いました。\n追加件数: " 
                                + finalAddedCount + " 件\n削除件数: " + removedCount + " 件");
} 