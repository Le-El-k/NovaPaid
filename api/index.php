<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = '127.0.0.1';
$db   = 'novapaid';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur de connexion MySQL XAMPP: ' . $e->getMessage()
    ]);
    exit;
}

$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts = explode('/', $path);
$endpoint = end($parts);

$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($endpoint) {
    case 'wallet':
        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT id, name, email, phone, role, status, kyc_status FROM users WHERE id = ?");
            $stmt->execute([1]);
            $userRow = $stmt->fetch();

            $wStmt = $pdo->prepare("SELECT id, account_key, currency, available_minor FROM wallets WHERE user_id = ?");
            $wStmt->execute([1]);
            $walletRow = $wStmt->fetch();

            echo json_encode([
                'success' => true,
                'profile' => $userRow,
                'wallet' => [
                    'id' => $walletRow['id'] ?? 1,
                    'accountKey' => $walletRow['account_key'] ?? 'WLT_1',
                    'currency' => $walletRow['currency'] ?? 'XAF',
                    'availableMinor' => (int)($walletRow['available_minor'] ?? 0),
                    'balanceXaf' => round(($walletRow['available_minor'] ?? 0) / 100)
                ]
            ]);
        } elseif ($method === 'POST') {
            $action = $body['action'] ?? null;
            $amount = (int)($body['amount'] ?? 0);
            if ($amount <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Montant invalide']);
                exit;
            }
            $amountMinor = $amount * 100;
            if ($action === 'deposit') {
                $pdo->prepare("UPDATE wallets SET available_minor = available_minor + ? WHERE user_id = ?")->execute([$amountMinor, 1]);
                echo json_encode(['success' => true, 'amountXaf' => $amount]);
            } elseif ($action === 'withdraw') {
                $pdo->prepare("UPDATE wallets SET available_minor = available_minor - ? WHERE user_id = ?")->execute([$amountMinor, 1]);
                echo json_encode(['success' => true, 'amountXaf' => $amount]);
            }
        }
        break;

    case 'cards':
        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT * FROM cards WHERE user_id = ? ORDER BY id DESC");
            $stmt->execute([1]);
            $rows = $stmt->fetchAll();
            $cards = array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'label' => $r['label'],
                    'maskedPan' => $r['masked_pan'],
                    'cardType' => $r['card_type'],
                    'status' => $r['status'],
                    'balanceUsd' => round($r['external_balance_minor'] / 100, 2),
                    'brand' => strpos(strtolower($r['label']), 'visa') !== false ? 'visa' : 'mastercard'
                ];
            }, $rows);
            echo json_encode(['success' => true, 'cards' => $cards]);
        }
        break;

    default:
        echo json_encode(['success' => true, 'service' => 'NovaPaid API', 'status' => 'online']);
        break;
}
